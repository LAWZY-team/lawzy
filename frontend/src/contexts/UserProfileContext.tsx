"use client";

import React, { createContext, useContext } from "react";

export type ApiKeyProvider =
    | "claude"
    | "gemini"
    | "openai"
    | "openrouter"
    | "courtlistener";

export type ApiKeySource = "user" | "env" | null;

export type ApiKeyState = Record<
    ApiKeyProvider,
    {
        configured: boolean;
        source: ApiKeySource;
    }
>;

export interface UserProfile {
    displayName: string | null;
    organisation: string | null;
    messageCreditsUsed: number;
    creditsResetDate: string;
    creditsRemaining: number;
    tier: string;
    titleModel: string;
    tabularModel: string;
    mfaOnLogin: boolean;
    legalResearchUs: boolean;
    apiKeys: ApiKeyState;
}

const emptyApiKeys: ApiKeyState = {
    claude: { configured: true, source: "env" },
    gemini: { configured: true, source: "env" },
    openai: { configured: true, source: "env" },
    openrouter: { configured: true, source: "env" },
    courtlistener: { configured: true, source: "env" },
};

const mockProfile: UserProfile = {
    displayName: "User",
    organisation: null,
    messageCreditsUsed: 0,
    creditsResetDate: new Date().toISOString(),
    creditsRemaining: 999999,
    tier: "Enterprise",
    titleModel: "gemini-2.5-flash",
    tabularModel: "gemini-2.5-flash",
    mfaOnLogin: false,
    legalResearchUs: false,
    apiKeys: emptyApiKeys,
};

interface UserProfileContextType {
    profile: UserProfile | null;
    loading: boolean;
    updateDisplayName: (name: string) => Promise<boolean>;
    updateOrganisation: (organisation: string) => Promise<boolean>;
    updateModelPreference: (
        field: "titleModel" | "tabularModel",
        value: string,
    ) => Promise<boolean>;
    updateMfaOnLogin: (enabled: boolean) => Promise<boolean>;
    updateLegalResearchUs: (enabled: boolean) => Promise<boolean>;
    updateApiKey: (
        provider: ApiKeyProvider,
        value: string | null,
    ) => Promise<boolean>;
    reloadProfile: () => Promise<void>;
    incrementMessageCredits: () => Promise<boolean>;
}

const UserProfileContext = createContext<UserProfileContextType | undefined>(
    undefined,
);

export function UserProfileProvider({ children }: { children: React.ReactNode }) {
    const updateDisplayName = async () => true;
    const updateOrganisation = async () => true;
    const updateModelPreference = async (field: "titleModel" | "tabularModel", value: string) => true;
    const updateMfaOnLogin = async () => true;
    const updateLegalResearchUs = async () => true;
    const updateApiKey = async () => true;
    const reloadProfile = async () => {};
    const incrementMessageCredits = async () => false;

    return (
        <UserProfileContext.Provider
            value={{
                profile: mockProfile,
                loading: false,
                updateDisplayName,
                updateOrganisation,
                updateModelPreference,
                updateMfaOnLogin,
                updateLegalResearchUs,
                updateApiKey,
                reloadProfile,
                incrementMessageCredits,
            }}
        >
            {children}
        </UserProfileContext.Provider>
    );
}

export function useUserProfile() {
    return {
        profile: mockProfile,
        loading: false,
        updateDisplayName: async () => true,
        updateOrganisation: async () => true,
        updateModelPreference: async (field: "titleModel" | "tabularModel", value: string) => true,
        updateMfaOnLogin: async () => true,
        updateLegalResearchUs: async () => true,
        updateApiKey: async () => true,
        reloadProfile: async () => {},
        incrementMessageCredits: async () => false,
    };
}
