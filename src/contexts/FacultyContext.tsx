import React, { createContext, useContext, useState, ReactNode, useEffect } from 'react';
import { FacultyMember, CreateFacultyData } from '@/types/faculty';
import { subscribeFaculty, toggleFacultyActive } from '@/services/facultyService';

interface FacultyContextType {
  facultyMembers: FacultyMember[];
  addFaculty: (data: CreateFacultyData) => void;
  updateFaculty: (id: string, data: Partial<FacultyMember>) => void;
  toggleFacultyStatus: (id: string) => void;
  getFacultyById: (id: string) => FacultyMember | undefined;
}

const FacultyContext = createContext<FacultyContextType | undefined>(undefined);

export function FacultyProvider({ children }: { children: ReactNode }) {
  const [facultyMembers, setFacultyMembers] = useState<FacultyMember[]>([]);

  useEffect(() => {
    // Subscribe to real-time faculty data from Firebase
    const unsubscribe = subscribeFaculty((faculty) => {
      setFacultyMembers(faculty);
    });

    // Cleanup subscription on unmount
    return () => {
      unsubscribe();
    };
  }, []);

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
    const member = facultyMembers.find(m => m.id === id);
    if (member) {
      // Update in Firebase
      toggleFacultyActive(id, member.isActive);
      // Update local state
      setFacultyMembers((prev) =>
        prev.map((member) =>
          member.id === id ? { ...member, isActive: !member.isActive } : member
        )
      );
    }
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
