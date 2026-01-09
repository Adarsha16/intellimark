export interface Event {
    id: number;
    title: string;
    description: string;
    location: string;
    date: string;
    capacity: number;
    status: string;
    marketing_strategy?: string;
}

export interface SponsorMatch {
    sponsor_id: number;
    company_name: string;
    contact_email: string;
    notes?: string;
    match_score: number;
}

export interface EventFormData {
    title: string;
    description: string;
    location: string;
    date: string;
    capacity: number;
}