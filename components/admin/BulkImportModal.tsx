"use client";
import { useState, useRef } from 'react';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Progress } from '@/components/ui/progress';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { Upload, Users, CheckCircle, XCircle, AlertCircle, Download } from 'lucide-react';
import Papa from 'papaparse';
import { toast } from 'sonner';

interface UserImportData {
  email: string;
  firstName: string;
  lastName: string;
  role: 'STUDENT' | 'PROFESSOR' | 'ADMIN';
  paid: boolean;
}

interface ImportResult {
  success: boolean;
  message: string;
  details?: any;
}

export default function BulkImportModal() {
  const [isOpen, setIsOpen] = useState(false);
  const [isImporting, setIsImporting] = useState(false);
  const [csvData, setCsvData] = useState<UserImportData[]>([]);
  const [validationErrors, setValidationErrors] = useState<string[]>([]);
  const [importProgress, setImportProgress] = useState(0);
  const [importResults, setImportResults] = useState<ImportResult[]>([]);
  const [currentStep, setCurrentStep] = useState<'upload' | 'preview' | 'importing' | 'complete'>('upload');
  const fileInputRef = useRef<HTMLInputElement>(null);

  const handleFileUpload = (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    if (!file) return;

    if (file.type !== 'text/csv' && !file.name.endsWith('.csv')) {
      toast.error('Please upload a valid CSV file');
      return;
    }

    const reader = new FileReader();
    reader.onload = (e) => {
      try {
        const csvText = e.target?.result as string;
        Papa.parse<string>(csvText, {
          header: true,
          skipEmptyLines: true,
          complete: (results) => {
            const parsedData = results.data as any[];
            const validatedData: UserImportData[] = [];
            const errors: string[] = [];

            parsedData.forEach((row, index) => {
              const rowNumber = index + 2; // +2 because of 0-index and header row
              
              // Validate required fields
              if (!row.email || !row.role) {
                errors.push(`Row ${rowNumber}: Missing required fields (email and role are required)`);
                return;
              }

              // Validate email format
              const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
              if (!emailRegex.test(row.email)) {
                errors.push(`Row ${rowNumber}: Invalid email format`);
                return;
              }

              // Validate role
              if (!['STUDENT', 'PROFESSOR', 'ADMIN'].includes(row.role)) {
                errors.push(`Row ${rowNumber}: Invalid role. Must be STUDENT, PROFESSOR, or ADMIN`);
                return;
              }

              // Validate paid field
              let paid = false;
              if (row.paid !== undefined && row.paid !== '') {
                if (typeof row.paid === 'string') {
                  paid = row.paid.toLowerCase() === 'true' || row.paid === '1';
                } else {
                  paid = Boolean(row.paid);
                }
              }

              validatedData.push({
                email: row.email,
                firstName: row.firstName || '',
                lastName: row.lastName || '',
                role: row.role,
                paid
              });
            });

            if (errors.length > 0) {
              setValidationErrors(errors);
              toast.error(`${errors.length} validation errors found`);
            } else {
              setValidationErrors([]);
              setCsvData(validatedData);
              setCurrentStep('preview');
              toast.success(`CSV parsed successfully. ${validatedData.length} users ready for import.`);
            }
          },
          error: (error: Error) => {
            toast.error(`Error parsing CSV: ${error.message}`);
          }
        });
      } catch (error) {
        toast.error('Error reading file');
      }
    };
    reader.readAsText(file);
  };

  const handleImport = async () => {
    if (csvData.length === 0) return;

    setIsImporting(true);
    setCurrentStep('importing');
    setImportProgress(0);
    setImportResults([]);

    try {
      const response = await fetch('/api/admin/users/bulk-import', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ users: csvData }),
      });

      if (!response.ok) {
        throw new Error(`Import failed: ${response.statusText}`);
      }

      const result = await response.json();
      
      if (result.success) {
        setImportResults(result.results || []);
        setCurrentStep('complete');
        toast.success(`Successfully imported ${result.successCount || 0} users`);
        
        // Refresh the page to show new users
        setTimeout(() => {
          window.location.reload();
        }, 2000);
      } else {
        throw new Error(result.error || 'Import failed');
      }
    } catch (error) {
      toast.error(`Import failed: ${error instanceof Error ? error.message : 'Unknown error'}`);
      setCurrentStep('preview');
    } finally {
      setIsImporting(false);
    }
  };

  const downloadTemplate = () => {
    const template = 'email,firstName,lastName,role,paid\njohn.doe@university.edu,John,Doe,STUDENT,false\njane.smith@university.edu,Jane,Smith,PROFESSOR,false';
    const blob = new Blob([template], { type: 'text/csv' });
    const url = window.URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = 'user_import_template.csv';
    a.click();
    window.URL.revokeObjectURL(url);
  };

  const resetModal = () => {
    setCsvData([]);
    setValidationErrors([]);
    setImportProgress(0);
    setImportResults([]);
    setCurrentStep('upload');
    if (fileInputRef.current) {
      fileInputRef.current.value = '';
    }
  };

  const handleOpenChange = (open: boolean) => {
    if (!open) {
      resetModal();
    }
    setIsOpen(open);
  };

  return (
    <Dialog open={isOpen} onOpenChange={handleOpenChange}>
      <DialogTrigger asChild>
        <Button className="bg-blue-600 hover:bg-blue-700 text-white">
          <Users className="w-4 h-4 mr-2" />
          Bulk Import Users
        </Button>
      </DialogTrigger>
      
      <DialogContent className="max-w-4xl max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle className="text-2xl font-bold">Bulk Import Users</DialogTitle>
        </DialogHeader>

        {currentStep === 'upload' && (
          <div className="space-y-6">
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <Upload className="w-5 h-5" />
                  Step 1: Upload CSV File
                </CardTitle>
              </CardHeader>
              <CardContent className="space-y-4">
                <div className="border-2 border-dashed border-gray-300 rounded-lg p-8 text-center">
                  <Upload className="w-12 h-12 mx-auto text-gray-400 mb-4" />
                  <p className="text-lg font-medium mb-2">Upload your CSV file</p>
                  <p className="text-gray-500 mb-4">
                    Drag and drop a CSV file here, or click to browse
                  </p>
                  <Button onClick={() => fileInputRef.current?.click()}>
                    Choose File
                  </Button>
                  <input
                    ref={fileInputRef}
                    type="file"
                    accept=".csv"
                    onChange={handleFileUpload}
                    className="hidden"
                  />
                </div>
                
                <div className="flex items-center justify-center">
                  <Button variant="outline" onClick={downloadTemplate}>
                    <Download className="w-4 h-4 mr-2" />
                    Download Template
                  </Button>
                </div>
              </CardContent>
            </Card>
          </div>
        )}

        {currentStep === 'preview' && (
          <div className="space-y-6">
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <CheckCircle className="w-5 h-5 text-green-500" />
                  Step 2: Preview Data
                </CardTitle>
              </CardHeader>
              <CardContent>
                <div className="mb-4">
                  <p className="text-sm text-gray-600">
                    {csvData.length} users ready for import
                  </p>
                </div>
                
                <div className="max-h-64 overflow-y-auto border rounded-lg">
                  <table className="w-full text-sm">
                    <thead className="bg-gray-50 sticky top-0">
                      <tr>
                        <th className="px-3 py-2 text-left font-medium">Email</th>
                        <th className="px-3 py-2 text-left font-medium">Name</th>
                        <th className="px-3 py-2 text-left font-medium">Role</th>
                        <th className="px-3 py-2 text-left font-medium">Paid</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-gray-200">
                      {csvData.map((user, index) => (
                        <tr key={index} className="hover:bg-gray-50">
                          <td className="px-3 py-2">{user.email}</td>
                          <td className="px-3 py-2">
                            {user.firstName} {user.lastName}
                          </td>
                          <td className="px-3 py-2">
                            <Badge variant={
                              user.role === 'ADMIN' ? 'default' :
                              user.role === 'PROFESSOR' ? 'secondary' : 'outline'
                            }>
                              {user.role}
                            </Badge>
                          </td>
                          <td className="px-3 py-2">
                            <Badge variant={user.paid ? 'default' : 'outline'}>
                              {user.paid ? 'Yes' : 'No'}
                            </Badge>
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              </CardContent>
            </Card>

            <div className="flex justify-between">
              <Button variant="outline" onClick={() => setCurrentStep('upload')}>
                Back
              </Button>
              <Button onClick={handleImport} disabled={isImporting}>
                {isImporting ? 'Importing...' : 'Start Import'}
              </Button>
            </div>
          </div>
        )}

        {currentStep === 'importing' && (
          <div className="space-y-6">
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <Upload className="w-5 h-5 animate-spin" />
                  Step 3: Importing Users
                </CardTitle>
              </CardHeader>
              <CardContent className="space-y-4">
                <div className="space-y-2">
                  <div className="flex justify-between text-sm">
                    <span>Progress</span>
                    <span>{Math.round(importProgress)}%</span>
                  </div>
                  <Progress value={importProgress} className="w-full" />
                </div>
                <p className="text-center text-gray-600">
                  Please wait while we create users in Clerk and sync them to the database...
                </p>
              </CardContent>
            </Card>
          </div>
        )}

        {currentStep === 'complete' && (
          <div className="space-y-6">
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <CheckCircle className="w-5 h-5 text-green-500" />
                  Import Complete
                </CardTitle>
              </CardHeader>
              <CardContent>
                <div className="space-y-4">
                  {importResults.map((result, index) => (
                    <Alert key={index} variant={result.success ? 'default' : 'destructive'}>
                      {result.success ? (
                        <CheckCircle className="w-4 h-4" />
                      ) : (
                        <XCircle className="w-4 h-4" />
                      )}
                      <AlertDescription>{result.message}</AlertDescription>
                    </Alert>
                  ))}
                </div>
                
                <div className="mt-6 text-center">
                  <p className="text-green-600 font-medium">
                    Import process completed successfully!
                  </p>
                  <p className="text-sm text-gray-600 mt-2">
                    The page will refresh automatically to show the new users.
                  </p>
                </div>
              </CardContent>
            </Card>

            <div className="flex justify-center">
              <Button onClick={() => handleOpenChange(false)}>
                Close
              </Button>
            </div>
          </div>
        )}

        {validationErrors.length > 0 && (
          <Alert variant="destructive">
            <AlertCircle className="w-4 h-4" />
            <AlertDescription>
              <div className="space-y-2">
                <p className="font-medium">Validation Errors:</p>
                <ul className="list-disc list-inside space-y-1">
                  {validationErrors.map((error, index) => (
                    <li key={index} className="text-sm">{error}</li>
                  ))}
                </ul>
              </div>
            </AlertDescription>
          </Alert>
        )}
      </DialogContent>
    </Dialog>
  );
}
