export type RiskClass = "low" | "medium" | "high";

export type TaxonomyId =
  | "password-reset"
  | "vpn-connect"
  | "wifi-onboarding"
  | "printer-queue"
  | "software-install"
  | "email-quota"
  | "sso-app-access"
  | "laptop-hardware"
  | "license-seat"
  | "mfa-device-lost"
  | "data-access-request"
  | "security-incident";

export const TAXONOMY: ReadonlyArray<{ id: TaxonomyId; label: string; risk: RiskClass }> = [
  { id: "password-reset", label: "Password reset / account lockout", risk: "low" },
  { id: "vpn-connect", label: "VPN will not connect", risk: "low" },
  { id: "wifi-onboarding", label: "Wi-Fi / device onboarding", risk: "low" },
  { id: "printer-queue", label: "Printer or print queue failure", risk: "low" },
  { id: "software-install", label: "Standard software install request", risk: "low" },
  { id: "email-quota", label: "Mailbox quota / sync failure", risk: "low" },
  { id: "sso-app-access", label: "SSO application access request", risk: "medium" },
  { id: "laptop-hardware", label: "Laptop hardware fault / replacement", risk: "medium" },
  { id: "license-seat", label: "License or seat assignment", risk: "medium" },
  { id: "mfa-device-lost", label: "MFA device lost or replaced", risk: "high" },
  { id: "data-access-request", label: "Data or share permission change", risk: "high" },
  { id: "security-incident", label: "Suspected security incident", risk: "high" },
];

export function riskClassOf(id: TaxonomyId | string): "low" | "medium" | "high" {
  for (const row of TAXONOMY) {
    if (row.id === id) {
      return row.risk;
    }
  }
  return "high";
}
