export type RoleKey = "super_admin" | "company_admin" | "team_lead" | "sales_user";

export interface FollowUp {
    id: string;
    date: string; // YYYY-MM-DD
    time: string; // HH:MM
    remark: string;
    createdBy: string;
    createdAt: string;
    talkedTo: string; // Required: Full Name of the director talked to
    talkedToId?: string; // ID of the director talked to
    talkedToName?: string; // Name of the director talked to
    followUpStatus: "Hot" | "Warm" | "Cold" | "Converted" | "Lost"; // Business status
    status?: "active" | "updated"; // Lifecycle status
}

export interface Director {
    id: string;
    din: string;
    firstName: string;
    lastName: string;
    mobile: string;
    email: string;
    followUps?: FollowUp[];
    nextFollowUpDate?: string;
    nextFollowUpTime?: string;
}

export type LeadStatus = "Hot" | "Warm" | "Cold" | "Converted" | "Lost";

export interface Lead {
    id: string;
    companyId: string;

    // MCA Data Fields
    cin: string;
    companyName: string;
    authorisedCapital?: string;
    paidUpCapital?: string;
    dateOfIncorporation?: string;
    registeredAddress?: string;
    companyEmail?: string;

    // Directors
    directors: Director[];

    // Legacy Director Fields (backward compatibility)
    din?: string;
    directorFirstName?: string;
    directorLastName?: string;
    mobile?: string;
    directorEmail?: string;

    // Lead Management
    status: LeadStatus;
    isAssigned: boolean;
    assignedTo: string | null;
    assignedAt?: string;
    // DEPRECATED: Do NOT use in UI or business logic.
    // Replaced by directors[].followUps[] + calculateNextFollowUpDate()
    followUpDate?: string | null;

    // DEPRECATED: Same reason as above
    nextFollowUpDate?: string | null;
    notes?: string;
    createdAt?: any;
    uploadedBy?: string;

    // Follow-up History


    // Converted Lead Fields
    invoiceNo?: string;
    projectValue?: string;
    convertedBy?: string;
    convertedAt?: any;

    // Lost Lead Fields
    lostRemark?: string;
    lostBy?: string;
    lostAt?: any;
}

export interface LostLead {
    id: string;
    lead: Lead;
    lostBy: string;
    lostDate: any;
    lostRemark?: string;
    isPermanent: boolean;
}

export interface FieldConfig {
    id: string;
    label: string;
    key: keyof Lead;
    type: 'text' | 'email' | 'tel' | 'date' | 'textarea' | 'select';
    required: boolean;
    showInForm: boolean;
    showInExcel: boolean;
    excelHeader: string;
    options?: string[];
}
