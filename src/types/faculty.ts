export interface FacultyMember {
  id: string;
  name: string;
  email: string;
  password?: string; // Only used during creation
  department: string;
  position: string;
  isActive: boolean;
  joinedDate: string;
  groups: string[];
  avatar?: string;
}

export interface CreateFacultyData {
  name: string;
  email: string;
  password: string;
  department: string;
  position: string;
  groups: string[];
}
