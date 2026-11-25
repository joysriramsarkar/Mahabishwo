/**
 * Instant search index across all scales: superclusters, clusters, galaxies,
 * star systems, host stars and planets.
 */
import { SUPERCLUSTERS, GALAXY_CLUSTERS, GALAXIES, STAR_SYSTEMS_CATALOG } from './cosmicData';
import { ScaleLevel } from '../core/types';

export interface SearchItem {
  id: string;
  name: string;
  nameBn: string;
  category: string;
  categoryBn: string;
  scaleLevel: ScaleLevel;
  color: string;
  systemId?: string;
  planetId?: string;
  galaxyId?: string;
  clusterId?: string;
  superclusterId?: string;
  memberId?: string;
}

export class SearchEngine {
  private static items: SearchItem[] = [];

  public static initialize(): void {
    this.items = [];

    SUPERCLUSTERS.forEach((sc) => {
      this.items.push({
        id: sc.id,
        name: sc.name,
        nameBn: sc.nameBn,
        category: 'Supercluster',
        categoryBn: 'সুপারক্লাস্টার',
        scaleLevel: ScaleLevel.COSMIC_WEB,
        color: sc.color,
        superclusterId: sc.id,
      });

      sc.members.forEach((member) => {
        this.items.push({
          id: member.id,
          name: member.name,
          nameBn: member.nameBn,
          category: 'Galaxy Cluster',
          categoryBn: 'সদস্য ক্লাস্টার',
          scaleLevel: ScaleLevel.COSMIC_WEB,
          color: sc.color,
          superclusterId: sc.id,
          memberId: member.id,
        });
      });
    });

    GALAXY_CLUSTERS.forEach((gc) => {
      this.items.push({
        id: gc.id,
        name: gc.name,
        nameBn: gc.nameBn,
        category: 'Galaxy Cluster',
        categoryBn: 'ছায়াপথ ক্লাস্টার',
        scaleLevel: ScaleLevel.GALAXY_CLUSTER,
        color: gc.color,
        clusterId: gc.id,
      });
    });

    GALAXIES.forEach((g) => {
      this.items.push({
        id: g.id,
        name: g.name,
        nameBn: g.nameBn,
        category: 'Galaxy',
        categoryBn: 'ছায়াপথ',
        scaleLevel: ScaleLevel.GALAXY,
        color: g.color,
        galaxyId: g.id,
      });
    });

    Object.values(STAR_SYSTEMS_CATALOG).forEach((sys) => {
      this.items.push({
        id: sys.id,
        name: sys.name,
        nameBn: sys.nameBn,
        category: 'Star System',
        categoryBn: 'নক্ষত্রমণ্ডল',
        scaleLevel: ScaleLevel.STAR_SYSTEM,
        color: sys.star.color,
        systemId: sys.id,
      });

      this.items.push({
        id: `${sys.id}_star`,
        name: sys.star.name,
        nameBn: sys.star.nameBn,
        category: 'Star',
        categoryBn: 'নক্ষত্র',
        scaleLevel: ScaleLevel.STAR_SYSTEM,
        color: sys.star.color,
        systemId: sys.id,
      });

      sys.planets.forEach((p) => {
        this.items.push({
          id: p.id,
          name: p.name,
          nameBn: p.nameBn,
          category: 'Planet',
          categoryBn: 'গ্রহ',
          scaleLevel: ScaleLevel.PLANET,
          color: p.color,
          systemId: sys.id,
          planetId: p.id,
        });
      });
    });
  }

  public static getAll(): SearchItem[] {
    return this.items;
  }

  public static search(query: string): SearchItem[] {
    const q = query.toLowerCase().trim();
    if (!q) return this.items.slice(0, 8);
    return this.items
      .filter(
        (item) =>
          item.name.toLowerCase().includes(q) ||
          item.nameBn.includes(q) ||
          item.category.toLowerCase().includes(q) ||
          item.categoryBn.includes(q)
      )
      .slice(0, 10);
  }
}
