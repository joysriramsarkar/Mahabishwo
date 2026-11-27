"""
Physics-Informed Neural Gravity Surrogate Training & ONNX Export
================================================================
Trains a streamlined Physics-Informed MLP (GravityNet: 64 -> SiLU -> 64 -> SiLU -> 3)
to approximate the gravitational + NFW dark-matter halo acceleration field of
two colliding galaxies (Milky Way + Andromeda) and exports it to
`public/models/galaxy_gravity.onnx` for 60 FPS WebGPU/WASM inference.

Input contract  : [batch_size, 11] float32 -> [x, y, z, x1, y1, z1, x2, y2, z2, m1, m2]
Output contract : [batch_size, 3]  float32 -> [ax, ay, az]
"""

from __future__ import annotations

import os
import time
from pathlib import Path

import numpy as np
import onnx
import torch
import torch.nn as nn
import torch.optim as optim

# Physical constants in scene units (1 unit ≈ 3.8 kly)
G_CONST = 1.0
SOFTENING = 2.0
DM_HALO_STRENGTH = 14.0
DM_CORE_RADIUS_SQ = 25.0
GLOBAL_HALO_STRENGTH = 0.35
GLOBAL_CORE_SQ = 12.0


def compute_ground_truth_numpy(
    star_pos: np.ndarray,
    core1_pos: np.ndarray,
    core2_pos: np.ndarray,
    masses: np.ndarray,
) -> np.ndarray:
    """Compute Newtonian + NFW-like dark matter halo gravitational acceleration."""
    r1 = core1_pos - star_pos
    dist1_sq = np.sum(r1**2, axis=1, keepdims=True) + SOFTENING**2
    dist1 = np.sqrt(dist1_sq)
    acc1 = G_CONST * masses[:, 0:1] * r1 / (dist1_sq * dist1)
    dm1 = DM_HALO_STRENGTH * (masses[:, 0:1] / 500.0) * r1 / (dist1_sq + DM_CORE_RADIUS_SQ)

    r2 = core2_pos - star_pos
    dist2_sq = np.sum(r2**2, axis=1, keepdims=True) + SOFTENING**2
    dist2 = np.sqrt(dist2_sq)
    acc2 = G_CONST * masses[:, 1:2] * r2 / (dist2_sq * dist2)
    dm2 = DM_HALO_STRENGTH * (masses[:, 1:2] / 500.0) * r2 / (dist2_sq + DM_CORE_RADIUS_SQ)

    r_center = -star_pos
    dist_c_sq = np.sum(r_center**2, axis=1, keepdims=True) + GLOBAL_CORE_SQ
    acc_global = GLOBAL_HALO_STRENGTH * r_center / dist_c_sq

    return (acc1 + dm1 + acc2 + dm2 + acc_global).astype(np.float32)


def generate_galaxy_data(samples: int = 160_000, seed: int = 42) -> tuple[torch.Tensor, torch.Tensor]:
    """Generate importance-sampled training pairs covering disks, bulges, and tidal tails."""
    rng = np.random.default_rng(seed)

    core1_pos = rng.uniform(-32.0, 32.0, (samples, 3)).astype(np.float32)
    core2_pos = rng.uniform(-32.0, 32.0, (samples, 3)).astype(np.float32)
    core1_pos[:, 1] *= 0.6
    core2_pos[:, 1] *= 0.6

    masses = rng.uniform(150.0, 950.0, (samples, 2)).astype(np.float32)

    n1 = samples // 3
    n2 = samples // 3
    n3 = samples - n1 - n2

    star_pos = np.empty((samples, 3), dtype=np.float32)

    dirs1 = rng.normal(size=(n1, 3)).astype(np.float32)
    dirs1 /= np.linalg.norm(dirs1, axis=1, keepdims=True) + 1e-6
    radii1 = np.exp(rng.uniform(np.log(0.6), np.log(36.0), size=(n1, 1))).astype(np.float32)
    star_pos[:n1] = core1_pos[:n1] + dirs1 * radii1

    dirs2 = rng.normal(size=(n2, 3)).astype(np.float32)
    dirs2 /= np.linalg.norm(dirs2, axis=1, keepdims=True) + 1e-6
    radii2 = np.exp(rng.uniform(np.log(0.6), np.log(36.0), size=(n2, 1))).astype(np.float32)
    star_pos[n1 : n1 + n2] = core2_pos[n1 : n1 + n2] + dirs2 * radii2

    star_pos[n1 + n2 :] = rng.uniform(-65.0, 65.0, (n3, 3)).astype(np.float32)

    total_acc = compute_ground_truth_numpy(star_pos, core1_pos, core2_pos, masses)
    inputs = np.hstack([star_pos, core1_pos, core2_pos, masses]).astype(np.float32)

    perm = rng.permutation(samples)
    return torch.from_numpy(inputs[perm]), torch.from_numpy(total_acc[perm])


class GravityNet(nn.Module):
    """
    Ultra-lightweight Physics-Informed MLP (64 -> SiLU -> 64 -> SiLU -> 3).

    Uses pure matrix projections (avoiding dynamic Slice/ReduceSum/Concat ops)
    so WebGPU and WASM SIMD execute cleanly with minimal graph dispatch overhead.
    """

    def __init__(self) -> None:
        super().__init__()

        # Projection matrices from [11] -> r1 (3), r2 (3), and normalized global/mass (5)
        p1 = torch.zeros(11, 3, dtype=torch.float32)
        p1[0:3, :] = -torch.eye(3)
        p1[3:6, :] = torch.eye(3)
        self.register_buffer("P1", p1)

        p2 = torch.zeros(11, 3, dtype=torch.float32)
        p2[0:3, :] = -torch.eye(3)
        p2[6:9, :] = torch.eye(3)
        self.register_buffer("P2", p2)

        p_base = torch.zeros(11, 5, dtype=torch.float32)
        p_base[0, 0] = 0.02
        p_base[1, 1] = 0.02
        p_base[2, 2] = 0.02
        p_base[9, 3] = 0.002
        p_base[10, 4] = 0.002
        self.register_buffer("P_base", p_base)

        self.register_buffer("sum3", torch.ones(3, 1, dtype=torch.float32))

        # Additive first-layer projections (mathematically equivalent to Concat + Linear, zero Concat op!)
        self.proj_base = nn.Linear(5, 64)
        self.proj_r1 = nn.Linear(3, 64, bias=False)
        self.proj_r2 = nn.Linear(3, 64, bias=False)
        self.proj_u1 = nn.Linear(3, 64, bias=False)
        self.proj_u2 = nn.Linear(3, 64, bias=False)
        self.proj_s1 = nn.Linear(1, 64, bias=False)
        self.proj_s2 = nn.Linear(1, 64, bias=False)

        self.act1 = nn.SiLU()
        self.fc2 = nn.Linear(64, 64)
        self.act2 = nn.SiLU()
        self.fc3 = nn.Linear(64, 3)

    def forward(self, x: torch.Tensor) -> torch.Tensor:
        r1 = torch.matmul(x, self.P1)
        r2 = torch.matmul(x, self.P2)
        base = torch.matmul(x, self.P_base)

        d1_sq = torch.matmul(r1 * r1, self.sum3) + (SOFTENING * SOFTENING)
        d2_sq = torch.matmul(r2 * r2, self.sum3) + (SOFTENING * SOFTENING)

        inv_d1 = 1.0 / torch.sqrt(d1_sq)
        inv_d2 = 1.0 / torch.sqrt(d2_sq)

        u1 = r1 * inv_d1
        u2 = r2 * inv_d2
        s1 = 10.0 / (d1_sq + 2.0)
        s2 = 10.0 / (d2_sq + 2.0)

        h = (
            self.proj_base(base)
            + self.proj_r1(r1 * 0.04)
            + self.proj_r2(r2 * 0.04)
            + self.proj_u1(u1)
            + self.proj_u2(u2)
            + self.proj_s1(s1)
            + self.proj_s2(s2)
        )
        h = self.act1(h)
        h = self.act2(self.fc2(h))
        return self.fc3(h)


def curl_penalty(model: nn.Module, x_batch: torch.Tensor) -> torch.Tensor:
    """Enforce curl(a) = 0 so the learned gravitational field is conservative."""
    x_req = x_batch.detach().clone().requires_grad_(True)
    pred = model(x_req)

    grad_ax = torch.autograd.grad(pred[:, 0].sum(), x_req, create_graph=True)[0][:, 0:3]
    grad_ay = torch.autograd.grad(pred[:, 1].sum(), x_req, create_graph=True)[0][:, 0:3]
    grad_az = torch.autograd.grad(pred[:, 2].sum(), x_req, create_graph=True)[0][:, 0:3]

    curl_x = grad_az[:, 1] - grad_ay[:, 2]
    curl_y = grad_ax[:, 2] - grad_az[:, 0]
    curl_z = grad_ay[:, 0] - grad_ax[:, 1]
    return torch.mean(curl_x**2 + curl_y**2 + curl_z**2)


def train_and_export() -> None:
    torch.manual_seed(42)
    t0 = time.perf_counter()

    print("Generating physics ground-truth dataset...")
    x_all, y_all = generate_galaxy_data(samples=160_000, seed=42)
    split = 144_000
    x_train, y_train = x_all[:split], y_all[:split]
    x_val, y_val = x_all[split:], y_all[split:]

    model = GravityNet()
    epochs = 55
    batch_size = 2048
    optimizer = optim.AdamW(model.parameters(), lr=4e-3, weight_decay=1e-5)
    scheduler = optim.lr_scheduler.CosineAnnealingLR(optimizer, T_max=epochs, eta_min=1e-4)

    print(f"Training streamlined GravityNet ({sum(p.numel() for p in model.parameters()):,} params) for {epochs} epochs...")
    for epoch in range(1, epochs + 1):
        model.train()
        perm = torch.randperm(x_train.shape[0])
        total_loss = 0.0
        steps = 0

        for start in range(0, x_train.shape[0], batch_size):
            idx = perm[start : start + batch_size]
            xb = x_train[idx]
            yb = y_train[idx]

            optimizer.zero_grad()
            pred = model(xb)

            diff = pred - yb
            mse = torch.mean(diff**2)
            rel_weight = 1.0 / (torch.linalg.norm(yb, dim=1, keepdim=True) + 0.5)
            rel_mse = torch.mean((diff * rel_weight) ** 2)
            loss = mse + 1.5 * rel_mse

            if steps % 8 == 0:
                loss = loss + 0.02 * curl_penalty(model, xb[:256])

            loss.backward()
            torch.nn.utils.clip_grad_norm_(model.parameters(), 2.0)
            optimizer.step()

            total_loss += float(loss.item())
            steps += 1

        scheduler.step()

        if epoch == 1 or epoch % 5 == 0 or epoch == epochs:
            model.eval()
            with torch.no_grad():
                val_pred = model(x_val)
                val_mse = float(torch.mean((val_pred - y_val) ** 2).item())
                cos_sim = float(
                    torch.mean(torch.nn.functional.cosine_similarity(val_pred, y_val, dim=1)).item()
                )
                ss_res = torch.sum((y_val - val_pred) ** 2)
                ss_tot = torch.sum((y_val - torch.mean(y_val, dim=0)) ** 2)
                r2 = float(1.0 - ss_res / ss_tot)
            print(
                f"Epoch {epoch:02d}/{epochs} | train_loss={total_loss/steps:.5f} | "
                f"val_mse={val_mse:.5f} | R2={r2:.5f} | cos_sim={cos_sim:.5f}"
            )

    out_path = Path(__file__).resolve().parent.parent / "public" / "models" / "galaxy_gravity.onnx"
    out_path.parent.mkdir(parents=True, exist_ok=True)
    data_sidecar = Path(str(out_path) + ".data")
    if data_sidecar.exists():
        data_sidecar.unlink()

    model.eval()
    dummy_input = torch.randn(1000, 11, dtype=torch.float32)

    torch.onnx.export(
        model,
        dummy_input,
        str(out_path),
        export_params=True,
        opset_version=17,
        do_constant_folding=True,
        input_names=["inputs"],
        output_names=["accelerations"],
        dynamic_axes={"inputs": {0: "batch_size"}, "accelerations": {0: "batch_size"}},
        dynamo=False,
    )

    onnx_model = onnx.load(str(out_path))
    onnx.checker.check_model(onnx_model)
    size_kb = os.path.getsize(out_path) / 1024.0
    print(f"\nExported & verified ONNX model: {out_path} ({size_kb:.1f} KB) in {time.perf_counter() - t0:.1f}s")


if __name__ == "__main__":
    train_and_export()
