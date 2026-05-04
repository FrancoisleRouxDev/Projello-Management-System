// Temporary placeholder types for single project view mock rendering.
// Keep these aligned with the backend DTO shape, then move to a shared domain types module.
export type ProjectStat = {
  label: string;
  value: string;
};

export type ProgressItem = {
  label: string;
  value: number;
};

export type ProjectViewData = {
  projectName: string;
  clientName: string;
  completion: number;
  stats: ProjectStat[];
  projectDescription: string;
  progressBreakdown: ProgressItem[];
  photoTiles: string[];
};
