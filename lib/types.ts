export type Domain =
  | "housing"
  | "workplace"
  | "school"
  | "insurance"
  | "vendor"
  | "customer_support"
  | "platform"
  | "other";

export type Stance =
  | "clarify"
  | "deny_without_admitting"
  | "negotiate"
  | "comply_preserve_rights"
  | "request_evidence"
  | "maximum_bureaucracy";

export type CannonRequest = {
  threatText: string;
  domain: Domain;
  stance: Stance;
  slopDensity: number;
  governingDocumentText?: string;
  governingDocumentName?: string;
};

export type ParsedPdfResponse =
  | {
      ok: true;
      filename: string;
      totalPages: number;
      charCount: number;
      truncated: boolean;
      text: string;
      warning?: string;
    }
  | {
      ok: false;
      error: string;
    };

export type OutlineSection = {
  title: string;
  purpose: string;
  targetWords: number;
  mustInclude?: string[];
  mustAvoid?: string[];
};

export type CannonOutline = {
  title: string;
  summary: string;
  sections: OutlineSection[];
  appendixIdeas: string[];
};

export type GeneratedSection = {
  title: string;
  content: string;
};

export type CannonMetricEvent = {
  pages: number;
  questions: number;
  fogIndex: number;
  reviewBurden: string;
};

export type CannonStreamEvent =
  | {
      type: "status";
      message: string;
    }
  | {
      type: "outline";
      outline: CannonOutline;
    }
  | {
      type: "section";
      section: GeneratedSection;
      sectionNumber: number;
      totalSections: number;
    }
  | {
      type: "metrics";
      metrics: CannonMetricEvent;
    }
  | {
      type: "document";
      html: string;
    }
  | {
      type: "error";
      message: string;
    }
  | {
      type: "done";
    };
