"use client"

import { useState } from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { 
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { 
  Zap, 
  Save, 
  Trash2, 
  Clock,
  Calendar,
  Briefcase,
  Moon,
  Sun,
  Coffee
} from 'lucide-react';
import { toast } from 'sonner';

interface Template {
  id?: string;
  name: string;
  description: string;
  icon?: any;
  configuration: any;
  isGlobal?: boolean;
  isPremade?: boolean;
}

interface AvailabilityTemplatesProps {
  currentSchedule: any;
  onApplyTemplate: (template: Template) => void;
}

// Premade templates
const PREMADE_TEMPLATES: Template[] = [
  {
    name: 'Standard Business Hours',
    description: 'Monday to Friday, 9 AM - 5 PM with lunch break',
    icon: Briefcase,
    isPremade: true,
    configuration: {
      defaultSessionDuration: 60,
      bufferTimeBetweenSessions: 15,
      minAdvanceBookingHours: 24,
      maxAdvanceBookingDays: 90,
      allowInstantBooking: true,
      requireConfirmation: false,
      weeklyPatterns: [
        {
          dayOfWeek: 1,
          isEnabled: true,
          timeBlocks: [
            { startTime: '09:00', endTime: '12:00', type: 'AVAILABLE' },
            { startTime: '12:00', endTime: '13:00', type: 'BREAK' },
            { startTime: '13:00', endTime: '17:00', type: 'AVAILABLE' }
          ]
        },
        {
          dayOfWeek: 2,
          isEnabled: true,
          timeBlocks: [
            { startTime: '09:00', endTime: '12:00', type: 'AVAILABLE' },
            { startTime: '12:00', endTime: '13:00', type: 'BREAK' },
            { startTime: '13:00', endTime: '17:00', type: 'AVAILABLE' }
          ]
        },
        {
          dayOfWeek: 3,
          isEnabled: true,
          timeBlocks: [
            { startTime: '09:00', endTime: '12:00', type: 'AVAILABLE' },
            { startTime: '12:00', endTime: '13:00', type: 'BREAK' },
            { startTime: '13:00', endTime: '17:00', type: 'AVAILABLE' }
          ]
        },
        {
          dayOfWeek: 4,
          isEnabled: true,
          timeBlocks: [
            { startTime: '09:00', endTime: '12:00', type: 'AVAILABLE' },
            { startTime: '12:00', endTime: '13:00', type: 'BREAK' },
            { startTime: '13:00', endTime: '17:00', type: 'AVAILABLE' }
          ]
        },
        {
          dayOfWeek: 5,
          isEnabled: true,
          timeBlocks: [
            { startTime: '09:00', endTime: '12:00', type: 'AVAILABLE' },
            { startTime: '12:00', endTime: '13:00', type: 'BREAK' },
            { startTime: '13:00', endTime: '17:00', type: 'AVAILABLE' }
          ]
        },
        { dayOfWeek: 0, isEnabled: false, timeBlocks: [] },
        { dayOfWeek: 6, isEnabled: false, timeBlocks: [] }
      ]
    }
  },
  {
    name: 'Evening Mentor',
    description: 'Weekday evenings 6 PM - 9 PM',
    icon: Moon,
    isPremade: true,
    configuration: {
      defaultSessionDuration: 60,
      bufferTimeBetweenSessions: 10,
      minAdvanceBookingHours: 12,
      maxAdvanceBookingDays: 60,
      allowInstantBooking: true,
      requireConfirmation: false,
      weeklyPatterns: [
        {
          dayOfWeek: 1,
          isEnabled: true,
          timeBlocks: [
            { startTime: '18:00', endTime: '21:00', type: 'AVAILABLE' }
          ]
        },
        {
          dayOfWeek: 2,
          isEnabled: true,
          timeBlocks: [
            { startTime: '18:00', endTime: '21:00', type: 'AVAILABLE' }
          ]
        },
        {
          dayOfWeek: 3,
          isEnabled: true,
          timeBlocks: [
            { startTime: '18:00', endTime: '21:00', type: 'AVAILABLE' }
          ]
        },
        {
          dayOfWeek: 4,
          isEnabled: true,
          timeBlocks: [
            { startTime: '18:00', endTime: '21:00', type: 'AVAILABLE' }
          ]
        },
        {
          dayOfWeek: 5,
          isEnabled: true,
          timeBlocks: [
            { startTime: '18:00', endTime: '21:00', type: 'AVAILABLE' }
          ]
        },
        { dayOfWeek: 0, isEnabled: false, timeBlocks: [] },
        { dayOfWeek: 6, isEnabled: false, timeBlocks: [] }
      ]
    }
  },
  {
    name: 'Weekend Warrior',
    description: 'Saturday and Sunday, 10 AM - 4 PM',
    icon: Sun,
    isPremade: true,
    configuration: {
      defaultSessionDuration: 45,
      bufferTimeBetweenSessions: 15,
      minAdvanceBookingHours: 48,
      maxAdvanceBookingDays: 30,
      allowInstantBooking: true,
      requireConfirmation: false,
      weeklyPatterns: [
        {
          dayOfWeek: 0,
          isEnabled: true,
          timeBlocks: [
            { startTime: '10:00', endTime: '13:00', type: 'AVAILABLE' },
            { startTime: '13:00', endTime: '14:00', type: 'BREAK' },
            { startTime: '14:00', endTime: '16:00', type: 'AVAILABLE' }
          ]
        },
        { dayOfWeek: 1, isEnabled: false, timeBlocks: [] },
        { dayOfWeek: 2, isEnabled: false, timeBlocks: [] },
        { dayOfWeek: 3, isEnabled: false, timeBlocks: [] },
        { dayOfWeek: 4, isEnabled: false, timeBlocks: [] },
        { dayOfWeek: 5, isEnabled: false, timeBlocks: [] },
        {
          dayOfWeek: 6,
          isEnabled: true,
          timeBlocks: [
            { startTime: '10:00', endTime: '13:00', type: 'AVAILABLE' },
            { startTime: '13:00', endTime: '14:00', type: 'BREAK' },
            { startTime: '14:00', endTime: '16:00', type: 'AVAILABLE' }
          ]
        }
      ]
    }
  },
  {
    name: 'Flexible Schedule',
    description: 'Different hours each day, maximum flexibility',
    icon: Coffee,
    isPremade: true,
    configuration: {
      defaultSessionDuration: 30,
      bufferTimeBetweenSessions: 10,
      minAdvanceBookingHours: 6,
      maxAdvanceBookingDays: 45,
      allowInstantBooking: true,
      requireConfirmation: false,
      weeklyPatterns: [
        {
          dayOfWeek: 0,
          isEnabled: true,
          timeBlocks: [
            { startTime: '14:00', endTime: '18:00', type: 'AVAILABLE' }
          ]
        },
        {
          dayOfWeek: 1,
          isEnabled: true,
          timeBlocks: [
            { startTime: '07:00', endTime: '09:00', type: 'AVAILABLE' },
            { startTime: '17:00', endTime: '20:00', type: 'AVAILABLE' }
          ]
        },
        {
          dayOfWeek: 2,
          isEnabled: true,
          timeBlocks: [
            { startTime: '10:00', endTime: '14:00', type: 'AVAILABLE' }
          ]
        },
        {
          dayOfWeek: 3,
          isEnabled: true,
          timeBlocks: [
            { startTime: '07:00', endTime: '09:00', type: 'AVAILABLE' },
            { startTime: '17:00', endTime: '20:00', type: 'AVAILABLE' }
          ]
        },
        {
          dayOfWeek: 4,
          isEnabled: true,
          timeBlocks: [
            { startTime: '10:00', endTime: '14:00', type: 'AVAILABLE' }
          ]
        },
        {
          dayOfWeek: 5,
          isEnabled: true,
          timeBlocks: [
            { startTime: '15:00', endTime: '19:00', type: 'AVAILABLE' }
          ]
        },
        {
          dayOfWeek: 6,
          isEnabled: true,
          timeBlocks: [
            { startTime: '09:00', endTime: '12:00', type: 'AVAILABLE' }
          ]
        }
      ]
    }
  }
];

export function AvailabilityTemplates({
  currentSchedule,
  onApplyTemplate
}: AvailabilityTemplatesProps) {
  const [customTemplates, setCustomTemplates] = useState<Template[]>([]);
  const [saveDialogOpen, setSaveDialogOpen] = useState(false);
  const [templateName, setTemplateName] = useState('');
  const [templateDescription, setTemplateDescription] = useState('');

  // Save current schedule as template
  const saveAsTemplate = () => {
    if (!templateName.trim()) {
      toast.error('Please enter a template name');
      return;
    }

    const newTemplate: Template = {
      id: Date.now().toString(),
      name: templateName,
      description: templateDescription,
      configuration: {
        defaultSessionDuration: currentSchedule.defaultSessionDuration,
        bufferTimeBetweenSessions: currentSchedule.bufferTimeBetweenSessions,
        minAdvanceBookingHours: currentSchedule.minAdvanceBookingHours,
        maxAdvanceBookingDays: currentSchedule.maxAdvanceBookingDays,
        allowInstantBooking: currentSchedule.allowInstantBooking,
        requireConfirmation: currentSchedule.requireConfirmation,
        weeklyPatterns: currentSchedule.weeklyPatterns
      },
      isGlobal: false
    };

    setCustomTemplates(prev => [...prev, newTemplate]);
    
    // Save to localStorage (in production, this would be saved to the database)
    const savedTemplates = JSON.parse(localStorage.getItem('mentorTemplates') || '[]');
    savedTemplates.push(newTemplate);
    localStorage.setItem('mentorTemplates', JSON.stringify(savedTemplates));

    toast.success(`Template "${templateName}" saved successfully`);
    setSaveDialogOpen(false);
    setTemplateName('');
    setTemplateDescription('');
  };

  // Delete custom template
  const deleteTemplate = (templateId: string) => {
    setCustomTemplates(prev => prev.filter(t => t.id !== templateId));
    
    // Update localStorage
    const savedTemplates = JSON.parse(localStorage.getItem('mentorTemplates') || '[]');
    const filtered = savedTemplates.filter((t: Template) => t.id !== templateId);
    localStorage.setItem('mentorTemplates', JSON.stringify(filtered));
    
    toast.success('Template deleted');
  };

  // Load saved templates on mount
  useState(() => {
    const savedTemplates = JSON.parse(localStorage.getItem('mentorTemplates') || '[]');
    setCustomTemplates(savedTemplates);
  });

  return (
    <div className="space-y-6">
      {/* Save Current as Template */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Save className="h-5 w-5" />
            Save Current Schedule
          </CardTitle>
          <CardDescription>
            Save your current availability settings as a reusable template
          </CardDescription>
        </CardHeader>
        <CardContent>
          <Button onClick={() => setSaveDialogOpen(true)} className="gap-2">
            <Save className="h-4 w-4" />
            Save as Template
          </Button>
        </CardContent>
      </Card>

      {/* Premade Templates */}
      <Card>
        <CardHeader>
          <CardTitle>Quick Start Templates</CardTitle>
          <CardDescription>
            Choose from our premade templates to quickly set up your availability
          </CardDescription>
        </CardHeader>
        <CardContent>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            {PREMADE_TEMPLATES.map((template, index) => {
              const Icon = template.icon;
              return (
                <div
                  key={index}
                  className="border rounded-lg p-4 hover:bg-gray-50 dark:hover:bg-gray-800 transition-colors"
                >
                  <div className="flex items-start justify-between">
                    <div className="flex items-start gap-3">
                      <div className="w-10 h-10 bg-blue-100 dark:bg-blue-900/30 rounded-lg flex items-center justify-center">
                        <Icon className="h-5 w-5 text-blue-600 dark:text-blue-400" />
                      </div>
                      <div>
                        <h4 className="font-medium text-gray-900 dark:text-white">
                          {template.name}
                        </h4>
                        <p className="text-sm text-gray-600 dark:text-gray-400 mt-1">
                          {template.description}
                        </p>
                        <div className="flex items-center gap-2 mt-2">
                          <Badge variant="secondary" className="text-xs">
                            <Clock className="h-3 w-3 mr-1" />
                            {template.configuration.defaultSessionDuration} min sessions
                          </Badge>
                          <Badge variant="secondary" className="text-xs">
                            <Calendar className="h-3 w-3 mr-1" />
                            {template.configuration.weeklyPatterns.filter((p: any) => p.isEnabled).length} days/week
                          </Badge>
                        </div>
                      </div>
                    </div>
                    
                    <Button
                      variant="outline"
                      size="sm"
                      onClick={() => onApplyTemplate(template)}
                    >
                      Apply
                    </Button>
                  </div>
                </div>
              );
            })}
          </div>
        </CardContent>
      </Card>

      {/* Custom Templates */}
      {customTemplates.length > 0 && (
        <Card>
          <CardHeader>
            <CardTitle>Your Templates</CardTitle>
            <CardDescription>
              Templates you've saved from your availability settings
            </CardDescription>
          </CardHeader>
          <CardContent>
            <div className="space-y-3">
              {customTemplates.map((template) => (
                <div
                  key={template.id}
                  className="flex items-center justify-between p-4 border rounded-lg bg-white dark:bg-gray-800"
                >
                  <div>
                    <h4 className="font-medium text-gray-900 dark:text-white">
                      {template.name}
                    </h4>
                    {template.description && (
                      <p className="text-sm text-gray-600 dark:text-gray-400 mt-1">
                        {template.description}
                      </p>
                    )}
                  </div>
                  
                  <div className="flex items-center gap-2">
                    <Button
                      variant="outline"
                      size="sm"
                      onClick={() => onApplyTemplate(template)}
                    >
                      Apply
                    </Button>
                    <Button
                      variant="ghost"
                      size="sm"
                      onClick={() => deleteTemplate(template.id!)}
                    >
                      <Trash2 className="h-4 w-4" />
                    </Button>
                  </div>
                </div>
              ))}
            </div>
          </CardContent>
        </Card>
      )}

      {/* Save Template Dialog */}
      <Dialog open={saveDialogOpen} onOpenChange={setSaveDialogOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Save as Template</DialogTitle>
            <DialogDescription>
              Save your current availability settings as a reusable template
            </DialogDescription>
          </DialogHeader>

          <div className="space-y-4">
            <div className="space-y-2">
              <Label htmlFor="template-name">Template Name</Label>
              <Input
                id="template-name"
                placeholder="e.g., My Regular Schedule"
                value={templateName}
                onChange={(e) => setTemplateName(e.target.value)}
              />
            </div>

            <div className="space-y-2">
              <Label htmlFor="template-description">Description (Optional)</Label>
              <Textarea
                id="template-description"
                placeholder="Describe when to use this template..."
                value={templateDescription}
                onChange={(e) => setTemplateDescription(e.target.value)}
                rows={3}
              />
            </div>
          </div>

          <DialogFooter>
            <Button variant="outline" onClick={() => setSaveDialogOpen(false)}>
              Cancel
            </Button>
            <Button onClick={saveAsTemplate}>
              Save Template
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}