interface ProjectConfig {
  appName: string;
  appDescription: string;
  chatIconUrl: string;
  sections: {
    id: string;
    label: string;
    assistantName: string;
    instructions: string;
    welcomeMessage: string[];
  }[];
}

export const PROJECT_CONFIG: ProjectConfig = JSON.parse(process.env.NEXT_PUBLIC_PROJECT_CONFIG || "{}");

if (!PROJECT_CONFIG) {
  throw new Error("Project Config is not set. Please set the NEXT_PUBLIC_CONFIG environment variable.");
}

// export const API_URL = process.env.NEXT_PUBLIC_API_URL || "http://localhost:5001";
export const API_URL = "http://localhost:3000";
