import React, { createContext, useContext, useState, ReactNode, useEffect } from 'react';
import { FacultyMember, CreateFacultyData } from '@/types/faculty';
import { 
  subscribeFaculty, 
  toggleFacultyActive,
  updateFacultyDetails as updateFacultyDetailsService,
  deleteFacultyMember as deleteFacultyMemberService
} from '@/services/facultyService';

interface FacultyContextType {
  facultyMembers: FacultyMember[];
  addFaculty: (data: CreateFacultyData) => void;
  updateFaculty: (id: string, data: Partial<FacultyMember>) => void;
  updateFacultyDetails: (id: string, data: Partial<FacultyMember>, oldData: FacultyMember) => Promise<boolean>;
  toggleFacultyStatus: (id: string) => void;
  deleteFacultyMember: (id: string) => Promise<boolean>;
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
      // Local state will be updated automatically by the subscribeFaculty listener
    }
  };

  const getFacultyById = (id: string) => {
    return facultyMembers.find((member) => member.id === id);
  };

  const updateFacultyDetails = async (id: string, data: Partial<FacultyMember>, oldData: FacultyMember) => {
    try {
      // Prepare the data to send to Firebase
      const updateData: Partial<{ name: string; department: string; position: string; groups: string[] }> = {};
      
      if (data.name !== undefined) updateData.name = data.name;
      if (data.department !== undefined) updateData.department = data.department;
      if (data.position !== undefined) updateData.position = data.position;
      if (data.groups !== undefined) updateData.groups = data.groups;

      // Update in Firebase
      const success = await updateFacultyDetailsService(id, updateData, oldData);
      
      // Local state will be updated automatically by the subscribeFaculty listener
      return success;
    } catch (error) {
      console.error('Error updating faculty details:', error);
      return false;
    }
  };

  const deleteFacultyMember = async (id: string) => {
    try {
      // Delete from Firebase
      const success = await deleteFacultyMemberService(id);
      
      // Local state will be updated automatically by the subscribeFaculty listener
      return success;
    } catch (error) {
      console.error('Error deleting faculty member:', error);
      return false;
    }
  };

  return (
    <FacultyContext.Provider
      value={{
        facultyMembers,
        addFaculty,
        updateFaculty,
        updateFacultyDetails,
        toggleFacultyStatus,
        deleteFacultyMember,
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