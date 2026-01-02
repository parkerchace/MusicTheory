// Core data model interfaces for Wikipedia-free scale validation system

export interface ApprovedSource {
  hostname: string;
  priority: number;
  scaleTypes: string[];
  reliability: number;
  accessPattern: string;
  culturalContext?: string[]; // Cultural regions this source specializes in
  sourceType?: 'traditional' | 'jazz' | 'academic' | 'cultural' | 'generic';
}

export interface ValidationResult {
  scaleId: string;
  status: 'verified' | 'failed' | 'pending' | 'unverifiable';
  sources: CitationResult[];
  internetVerification: InternetVerificationResult;
  primarySource: string;
  backupSources: string[];
  validatedAt: Date;
  hallucinationRisk: 'low' | 'medium' | 'high';
  errorSummary?: ValidationErrorSummary;
}

export interface ValidationErrorSummary {
  totalErrors: number;
  errorsByCategory: { [category: string]: number };
  errorsBySeverity: { [severity: string]: number };
  criticalErrors: ErrorDetails[];
  recommendedActions: string[];
}

export interface InternetVerificationResult {
  scaleExists: boolean;
  sourcesFound: number;
  independentConfirmations: number;
  searchQueries: string[];
  foundSources: string[];
  confidence: number;
  notes: string[];
}

export interface CitationResult {
  url: string;
  title: string;
  accessible: boolean;
  contentMatch: boolean;
  httpStatus: number;
  notes: string[];
  errorDetails?: ErrorDetails;
  contentMatchDiagnostics?: ContentMatchDiagnostics;
}

export interface ErrorDetails {
  category: 'network' | 'content' | 'source' | 'configuration';
  severity: 'low' | 'medium' | 'high' | 'critical';
  code: string;
  message: string;
  suggestedFix?: string;
  timestamp: Date;
  retryable: boolean;
}

export interface ContentMatchDiagnostics {
  expectedKeywords: string[];
  foundKeywords: string[];
  missingKeywords: string[];
  matchPercentage: number;
  contentLength: number;
  searchStrategy: string;
}

export interface ScaleData {
  id: string;
  name: string;
  culturalContext?: string;
  notes: string[];
  intervals: number[];
  description?: string;
}

export interface ValidationConfig {
  approvedSources: ApprovedSource[];
  timeoutMs: number;
  retryAttempts: number;
  minSourceDiversity: number;
  maxSingleSourcePercentage: number;
}

export interface Scale_Database {
  getScale(scaleId: string): Promise<ScaleData | null>;
  getAllScales(): Promise<ScaleData[]>;
  addScale(scale: ScaleData, validationResult: ValidationResult): Promise<void>;
  updateScale(scaleId: string, scale: ScaleData, validationResult: ValidationResult): Promise<void>;
  removeScale(scaleId: string): Promise<void>;
  getScalesByStatus(status: 'verified' | 'unverified' | 'pending'): Promise<ScaleData[]>;
  markScaleAsUnverified(scaleId: string, reason: string): Promise<void>;
  getValidationResult(scaleId: string): Promise<ValidationResult | null>;
  requiresAuthoritativeSource(scaleId: string): Promise<boolean>;
}

export interface StoredScale extends ScaleData {
  validationResult: ValidationResult;
  isVerified: boolean;
  unverifiedReason?: string;
  lastValidated: Date;
}

export interface ValidationSummary {
  totalScales: number;
  verifiedScales: number;
  failedScales: number;
  unverifiableScales: number;
  wikipediaRejections: number;
  backupSourceUsage: number;
  sourceDiversity: { [hostname: string]: number };
  averageVerificationTime?: number;
  errorsByCategory?: { [category: string]: number };
}