import React, { createContext, useContext, useState, ReactNode } from 'react';
import { FacultyMember, CreateFacultyData } from '@/types/faculty';

interface FacultyContextType {
  facultyMembers: FacultyMember[];
  addFaculty: (data: CreateFacultyData) => void;
  updateFaculty: (id: string, data: Partial<FacultyMember>) => void;
  toggleFacultyStatus: (id: string) => void;
  getFacultyById: (id: string) => FacultyMember | undefined;
}

const FacultyContext = createContext<FacultyContextType | undefined>(undefined);

// Default faculty members including demo accounts
const defaultFacultyMembers: FacultyMember[] = [
  {
    id: '1',
    name: 'Dr. Maria Santos',
    email: 'admin@pacfu.psau.edu',
    department: 'Administration',
    position: 'System Administrator',
    isActive: true,
    joinedDate: new Date().toLocaleDateString('en-US', { month: 'short', year: 'numeric' }),
    groups: ['PACFU Officers', 'Research Committee'],
  },
  {
    id: '2',
    name: 'Prof. Juan Dela Cruz',
    email: 'faculty@pacfu.psau.edu',
    department: 'College of Engineering',
    position: 'Associate Professor',
    isActive: true,
    joinedDate: new Date().toLocaleDateString('en-US', { month: 'short', year: 'numeric' }),
    groups: ['Curriculum Committee'],
  },
  {
    id: '3',
    name: 'Dr. Ana Reyes',
    email: 'ana.reyes@psau.edu.ph',
    department: 'College of Business',
    position: 'Professor II',
    isActive: true,
    joinedDate: 'Mar 2021',
    groups: ['Research Committee', 'Faculty Development'],
  },
  {
    id: '4',
    name: 'Prof. Pedro Lim',
    email: 'pedro.lim@psau.edu.ph',
    department: 'College of Agriculture',
    position: 'Assistant Professor',
    isActive: false,
    joinedDate: 'Sep 2022',
    groups: [],
  },
  {
    id: '5',
    name: 'Dr. Elena Cruz',
    email: 'elena.cruz@psau.edu.ph',
    department: 'Graduate Studies',
    position: 'Professor IV',
    isActive: true,
    joinedDate: 'Aug 2018',
    groups: ['Research Committee', 'PACFU Officers', 'Curriculum Committee'],
  },
];

export function FacultyProvider({ children }: { children: ReactNode }) {
  const [facultyMembers, setFacultyMembers] = useState<FacultyMember[]>(defaultFacultyMembers);

  const addFaculty = (data: CreateFacultyData) => {
    const newFaculty: FacultyMember = {
      id: Date.now().toString(),
      name: data.name,
      email: data.email,
      department: data.department,
      position: data.position,
      isActive: true,
      joinedDate: new Date().toLocaleDateString('en-US', { month: 'short', year: 'numeric' }),
      groups: data.groups,
    };
    setFacultyMembers((prev) => [...prev, newFaculty]);
  };

  const updateFaculty = (id: string, data: Partial<FacultyMember>) => {
    setFacultyMembers((prev) =>
      prev.map((member) =>
        member.id === id ? { ...member, ...data } : member
      )
    );
  };

  const toggleFacultyStatus = (id: string) => {
    setFacultyMembers((prev) =>
      prev.map((member) =>
        member.id === id ? { ...member, isActive: !member.isActive } : member
      )
    );
  };

  const getFacultyById = (id: string) => {
    return facultyMembers.find((member) => member.id === id);
  };

  return (
    <FacultyContext.Provider
      value={{
        facultyMembers,
        addFaculty,
        updateFaculty,
        toggleFacultyStatus,
        getFacultyById,
      }}
    >
      {children}
    </FacultyContext.Provider>
  );
}

export function useFaculty() {
  const context = useContext(FacultyContext);
  if (context === undefined) {
    throw new Error('useFaculty must be used within a FacultyProvider');
  }
  return context;
}
