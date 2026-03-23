'use client'

import { useState } from 'react'
import { X, BookOpen, CheckCircle, GraduationCap } from 'lucide-react'
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog'
import { ScrollArea } from '@/components/ui/scroll-area'

interface TeacherClassesModalProps {
  isOpen: boolean
  onClose: () => void
  assignments: any[]
}

export function TeacherClassesModal({ isOpen, onClose, assignments }: TeacherClassesModalProps) {
  
  // Helper to determine what subjects to display
  const getSubjectDisplay = (assignment: any) => {
    // Check level logic first (KG and Lower Primary usually teach all subjects)
    // Note: level is passed inside assignments.classes or top level? 
    // TeacherContext maps it to assignment.classes.level based on previous step
    const level: string = assignment.classes?.level || '';
    const isClassTeacher = assignment.is_class_teacher;

    // Direct check for "All Subjects" scenarios
    if (
      level.toLowerCase().includes('kindergarten') || 
      level.toLowerCase().includes('kg') ||
      level.toLowerCase().includes('lower') || // "Lower Primary"
      ['basic 1', 'basic 2', 'basic 3', 'class 1', 'class 2', 'class 3'].some(l => level.toLowerCase().includes(l))
    ) {
        return { type: 'all', text: 'All Subjects (Class Teacher)' };
    }

    // Attempt to list subjects if available
    if (assignment.subjects && assignment.subjects.length > 0) {
        // Filter out valid subjects
        const subjects = assignment.subjects.filter((s: any) => s.subject_name || s.name);
        if (subjects.length > 0) {
            return { type: 'list', subjects };
        }
    }

    // Fallback if no subjects found but is class teacher
    if (isClassTeacher) {
        return { type: 'all', text: 'All Subjects' };
    }

    return { type: 'none', text: 'No subjects assigned' };
  }

  return (
    <Dialog open={isOpen} onOpenChange={onClose}>
      <DialogContent className="sm:max-w-2xl bg-white dark:bg-gray-800">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2 text-xl">
            <BookOpen className="w-6 h-6 text-indigo-600" />
            My Assigned Classes
          </DialogTitle>
        </DialogHeader>
        
        <ScrollArea className="max-h-[60vh] pr-4">
            {assignments.length === 0 ? (
                <div className="text-center py-8 text-muted-foreground">
                    No classes assigned yet.
                </div>
            ) : (
                <div className="space-y-4">
                    {assignments.map((assignment, idx) => {
                        const subjectInfo = getSubjectDisplay(assignment);
                        
                        return (
                            <div key={idx} className="p-4 border rounded-lg bg-gray-50 dark:bg-gray-900/50 dark:border-gray-700">
                                <div className="flex justify-between items-start mb-3">
                                    <div>
                                        <h3 className="text-lg font-bold text-gray-900 dark:text-white flex items-center gap-2">
                                            {assignment.classes?.class_name || 'Unknown Class'}
                                            {assignment.is_class_teacher && (
                                                <span className="text-xs bg-blue-100 text-blue-700 px-2 py-0.5 rounded-full border border-blue-200">
                                                    Class Teacher
                                                </span>
                                            )}
                                        </h3>
                                        <p className="text-xs text-gray-500 mt-1 capitalize">
                                            {assignment.classes?.level?.replace('_', ' ') || 'Level not specified'}
                                        </p>
                                    </div>
                                    <div className="p-2 bg-indigo-100 text-indigo-600 rounded-full dark:bg-indigo-900/30 dark:text-indigo-400">
                                        <GraduationCap className="w-5 h-5" />
                                    </div>
                                </div>
                                
                                <div className="mt-4">
                                    <h4 className="text-sm font-semibold text-gray-600 dark:text-gray-400 mb-2 uppercase tracking-wide">
                                        Subjects Assigned
                                    </h4>
                                    
                                    {subjectInfo.type === 'all' ? (
                                        <div className="flex items-center gap-2 text-green-600 dark:text-green-400 bg-green-50 dark:bg-green-900/20 p-3 rounded-md">
                                            <CheckCircle className="w-5 h-5" />
                                            <span className="font-medium">{subjectInfo.text}</span>
                                        </div>
                                    ) : subjectInfo.type === 'list' ? (
                                        <div className="flex flex-wrap gap-2">
                                            {subjectInfo.subjects.map((sub: any, sIdx: number) => (
                                                <span 
                                                    key={sIdx} 
                                                    className="px-3 py-1 bg-white dark:bg-gray-800 border border-gray-200 dark:border-gray-700 rounded-md text-sm text-gray-700 dark:text-gray-300 shadow-sm"
                                                >
                                                    {sub.subject_name || sub.name}
                                                </span>
                                            ))}
                                        </div>
                                    ) : (
                                        <div className="text-sm text-gray-500 italic">
                                            {subjectInfo.text}
                                        </div>
                                    )}
                                </div>
                            </div>
                        )
                    })}
                </div>
            )}
        </ScrollArea>
      </DialogContent>
    </Dialog>
  )
}
