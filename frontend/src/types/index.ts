export interface Event {
    id: number;
    title: string;
    description: string;
    location: string;
    date: string;
    capacity: number;
    status: string;
    marketing_strategy?: string;
    prize_pool?: string;
    organizer_name?: string;
    latitude?: number;
    longitude?: number;
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
    prize_pool?: string;
    organizer_name?: string;
    latitude?: number;
    longitude?: number;
}