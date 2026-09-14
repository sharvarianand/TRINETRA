/**
 * User type for Clerk authentication
 */
export interface AppUser {
    id?: string | null;
    firstName?: string | null;
    lastName?: string | null;
    email?: string | null;
    imageUrl?: string | null;
    createdAt?: number | null;
    updatedAt?: number | null;
}

/**
 * Crowd density standards (people per sq meter)
 * Based on international crowd safety guidelines
 */
export const CROWD_DENSITY_STANDARDS = {
    low: 0.5,
    medium: 1.5,
    high: 2.5,
} as const;

export type DensityLevel = keyof typeof CROWD_DENSITY_STANDARDS;
export type AreaUnit = 'sqm' | 'sqft';

/**
 * Calculate max safe capacity based on area and density level
 */
export function calculateCapacity(area: number, areaUnit: AreaUnit = 'sqm', densityLevel: DensityLevel = 'medium'): number {
    const areaInSqm = areaUnit === 'sqft' ? area * 0.0929 : area;
    const density = CROWD_DENSITY_STANDARDS[densityLevel];
    return Math.floor(areaInSqm * density);
}

/**
 * Camera configuration with area-based capacity
 */
export interface Camera {
    id: string;
    name: string;
    url: string;
    zone: string;
    enabled: boolean;
    status?: 'online' | 'offline' | 'error';
    area?: number;
    areaUnit?: AreaUnit;
    capacity?: number;
    densityLevel?: DensityLevel;
    useManualCapacity?: boolean;
}

/**
 * Camera analytics data
 */
export interface CameraAnalytics {
    camera_id: string;
    camera_name: string;
    zone: string;
    people_count: number;
    density: number;
    status: 'online' | 'offline';
}

/**
 * Aggregated analytics response
 */
export interface AllCamerasAnalytics {
    total_people_count: number;
    cameras: CameraAnalytics[];
    timestamp: number;
}
