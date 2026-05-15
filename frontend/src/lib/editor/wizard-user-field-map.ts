import type { UserCustomField } from '@/stores/user-fields-store'
import type { ContractTypeId } from './contract-wizard-config'
import type { WizardFormStep } from './contract-wizard-config'
import { DEFAULT_LABEL_BY_KEY } from './user-field-profile'

export interface WizardUserFieldMapping {
  wizardKey: string
  /** Try in order; first non-empty profile value wins */
  userKeys: readonly string[]
}

function profileMapFromCustomFields(customFields: UserCustomField[]): Record<string, string> {
  const m: Record<string, string> = {}
  for (const f of customFields) {
    m[f.key] = typeof f.defaultValue === 'string' ? f.defaultValue : ''
  }
  return m
}

function firstNonEmpty(map: Record<string, string>, keys: readonly string[]): string {
  for (const k of keys) {
    const v = map[k]
    if (typeof v === 'string' && v.trim()) return v
  }
  return ''
}

function mappingsFor(
  contractTypeId: ContractTypeId,
  roleId: string | null,
  stepId: string,
): readonly WizardUserFieldMapping[] {
  const r = roleId ?? ''
  if (contractTypeId === 'labor') {
    if (stepId === 'parties') {
      if (r === 'employer') {
        return [
          { wizardKey: 'EMPLOYER_NAME', userKeys: ['company_name'] },
          { wizardKey: 'EMPLOYER_ADDRESS', userKeys: ['address'] },
          { wizardKey: 'EMPLOYER_TAX_CODE', userKeys: ['tax_id'] },
          { wizardKey: 'EMPLOYER_REPRESENTATIVE', userKeys: ['representative'] },
          { wizardKey: 'EMPLOYEE_NAME', userKeys: ['employee_name'] },
          { wizardKey: 'EMPLOYEE_ID', userKeys: ['employee_cccd'] },
          { wizardKey: 'EMPLOYEE_ADDRESS', userKeys: ['employee_address'] },
        ]
      }
      if (r === 'employee') {
        return [
          { wizardKey: 'EMPLOYER_NAME', userKeys: ['counterparty_company_name'] },
          { wizardKey: 'EMPLOYER_ADDRESS', userKeys: ['counterparty_address'] },
          { wizardKey: 'EMPLOYER_TAX_CODE', userKeys: ['counterparty_tax_id'] },
          { wizardKey: 'EMPLOYER_REPRESENTATIVE', userKeys: ['counterparty_representative'] },
          { wizardKey: 'EMPLOYEE_NAME', userKeys: ['employee_name', 'company_name'] },
          { wizardKey: 'EMPLOYEE_ID', userKeys: ['employee_cccd', 'representative_cccd'] },
          { wizardKey: 'EMPLOYEE_ADDRESS', userKeys: ['employee_address', 'address'] },
        ]
      }
    }
    if (stepId === 'position') {
      return [
        { wizardKey: 'JOB_TITLE', userKeys: ['position'] },
        { wizardKey: 'DEPARTMENT', userKeys: ['department'] },
        { wizardKey: 'WORK_LOCATION', userKeys: ['work_location'] },
        { wizardKey: 'JOB_DESCRIPTION', userKeys: ['job_description'] },
      ]
    }
  }
  if (contractTypeId === 'service' && stepId === 'parties') {
    if (r === 'client') {
      return [
        { wizardKey: 'PARTY_A_NAME', userKeys: ['company_name'] },
        { wizardKey: 'PARTY_A_ADDRESS', userKeys: ['address'] },
        { wizardKey: 'PARTY_A_TAX_CODE', userKeys: ['tax_id'] },
        { wizardKey: 'PARTY_A_REPRESENTATIVE', userKeys: ['representative'] },
        { wizardKey: 'PARTY_B_NAME', userKeys: ['counterparty_company_name'] },
        { wizardKey: 'PARTY_B_ADDRESS', userKeys: ['counterparty_address'] },
        { wizardKey: 'PARTY_B_TAX_CODE', userKeys: ['counterparty_tax_id'] },
        { wizardKey: 'PARTY_B_REPRESENTATIVE', userKeys: ['counterparty_representative'] },
      ]
    }
    if (r === 'provider') {
      return [
        { wizardKey: 'PARTY_B_NAME', userKeys: ['company_name'] },
        { wizardKey: 'PARTY_B_ADDRESS', userKeys: ['address'] },
        { wizardKey: 'PARTY_B_TAX_CODE', userKeys: ['tax_id'] },
        { wizardKey: 'PARTY_B_REPRESENTATIVE', userKeys: ['representative'] },
        { wizardKey: 'PARTY_A_NAME', userKeys: ['counterparty_company_name'] },
        { wizardKey: 'PARTY_A_ADDRESS', userKeys: ['counterparty_address'] },
        { wizardKey: 'PARTY_A_TAX_CODE', userKeys: ['counterparty_tax_id'] },
        { wizardKey: 'PARTY_A_REPRESENTATIVE', userKeys: ['counterparty_representative'] },
      ]
    }
  }
  if (contractTypeId === 'nda' && stepId === 'parties') {
    if (r === 'disclosing') {
      return [
        { wizardKey: 'DISCLOSING_PARTY_NAME', userKeys: ['company_name'] },
        { wizardKey: 'DISCLOSING_PARTY_ADDRESS', userKeys: ['address'] },
        { wizardKey: 'DISCLOSING_REPRESENTATIVE', userKeys: ['representative'] },
        { wizardKey: 'DISCLOSING_TAX_CODE', userKeys: ['tax_id', 'representative_cccd'] },
        { wizardKey: 'RECEIVING_PARTY_NAME', userKeys: ['counterparty_company_name'] },
        { wizardKey: 'RECEIVING_PARTY_ADDRESS', userKeys: ['counterparty_address'] },
        { wizardKey: 'RECEIVING_REPRESENTATIVE', userKeys: ['counterparty_representative'] },
        { wizardKey: 'RECEIVING_ID', userKeys: ['counterparty_tax_id'] },
      ]
    }
    if (r === 'receiving') {
      return [
        { wizardKey: 'RECEIVING_PARTY_NAME', userKeys: ['company_name'] },
        { wizardKey: 'RECEIVING_PARTY_ADDRESS', userKeys: ['address'] },
        { wizardKey: 'RECEIVING_REPRESENTATIVE', userKeys: ['representative'] },
        { wizardKey: 'RECEIVING_ID', userKeys: ['tax_id', 'representative_cccd'] },
        { wizardKey: 'DISCLOSING_PARTY_NAME', userKeys: ['counterparty_company_name'] },
        { wizardKey: 'DISCLOSING_PARTY_ADDRESS', userKeys: ['counterparty_address'] },
        { wizardKey: 'DISCLOSING_REPRESENTATIVE', userKeys: ['counterparty_representative'] },
        { wizardKey: 'DISCLOSING_TAX_CODE', userKeys: ['counterparty_tax_id'] },
      ]
    }
  }
  if (contractTypeId === 'goods' && stepId === 'parties') {
    if (r === 'seller') {
      return [
        { wizardKey: 'SELLER_NAME', userKeys: ['company_name'] },
        { wizardKey: 'SELLER_ADDRESS', userKeys: ['address'] },
        { wizardKey: 'SELLER_TAX_CODE', userKeys: ['tax_id'] },
        { wizardKey: 'SELLER_REPRESENTATIVE', userKeys: ['representative'] },
        { wizardKey: 'BUYER_NAME', userKeys: ['counterparty_company_name'] },
        { wizardKey: 'BUYER_ADDRESS', userKeys: ['counterparty_address'] },
        { wizardKey: 'BUYER_REPRESENTATIVE', userKeys: ['counterparty_representative'] },
      ]
    }
    if (r === 'buyer') {
      return [
        { wizardKey: 'BUYER_NAME', userKeys: ['company_name'] },
        { wizardKey: 'BUYER_ADDRESS', userKeys: ['address'] },
        { wizardKey: 'BUYER_REPRESENTATIVE', userKeys: ['representative'] },
        { wizardKey: 'SELLER_NAME', userKeys: ['counterparty_company_name'] },
        { wizardKey: 'SELLER_ADDRESS', userKeys: ['counterparty_address'] },
        { wizardKey: 'SELLER_TAX_CODE', userKeys: ['counterparty_tax_id'] },
        { wizardKey: 'SELLER_REPRESENTATIVE', userKeys: ['counterparty_representative'] },
      ]
    }
  }
  if (contractTypeId === 'rental' && stepId === 'parties') {
    if (r === 'lessor') {
      return [
        { wizardKey: 'LESSOR_NAME', userKeys: ['company_name'] },
        { wizardKey: 'LESSOR_ADDRESS', userKeys: ['address'] },
        { wizardKey: 'LESSOR_ID', userKeys: ['tax_id', 'representative_cccd'] },
        { wizardKey: 'LESSOR_BANK', userKeys: [] },
        { wizardKey: 'LESSEE_NAME', userKeys: ['counterparty_company_name'] },
        { wizardKey: 'LESSEE_ADDRESS', userKeys: ['counterparty_address'] },
        { wizardKey: 'LESSEE_ID', userKeys: ['counterparty_tax_id'] },
        { wizardKey: 'LESSEE_REPRESENTATIVE', userKeys: ['counterparty_representative'] },
      ]
    }
    if (r === 'lessee') {
      return [
        { wizardKey: 'LESSEE_NAME', userKeys: ['company_name'] },
        { wizardKey: 'LESSEE_ADDRESS', userKeys: ['address'] },
        { wizardKey: 'LESSEE_ID', userKeys: ['tax_id', 'representative_cccd'] },
        { wizardKey: 'LESSEE_REPRESENTATIVE', userKeys: ['representative'] },
        { wizardKey: 'LESSOR_NAME', userKeys: ['counterparty_company_name'] },
        { wizardKey: 'LESSOR_ADDRESS', userKeys: ['counterparty_address'] },
        { wizardKey: 'LESSOR_ID', userKeys: ['counterparty_tax_id'] },
        { wizardKey: 'LESSOR_BANK', userKeys: [] },
      ]
    }
  }
  return []
}

export function applyUserFieldsToWizardStep({
  contractTypeId,
  roleId,
  step,
  customFields,
}: {
  contractTypeId: ContractTypeId
  roleId: string | null
  step: WizardFormStep
  customFields: UserCustomField[]
}): Record<string, string> {
  const pmap = profileMapFromCustomFields(customFields)
  const stepKeys = new Set(step.fields.map((f) => f.key))
  const rows = mappingsFor(contractTypeId, roleId, step.id)
  const patch: Record<string, string> = {}
  for (const { wizardKey, userKeys } of rows) {
    if (!stepKeys.has(wizardKey) || userKeys.length === 0) continue
    const v = firstNonEmpty(pmap, userKeys)
    if (v) patch[wizardKey] = v
  }
  return patch
}

export function buildUserFieldPatchFromWizardStep({
  contractTypeId,
  roleId,
  step,
  wizardValues,
}: {
  contractTypeId: ContractTypeId
  roleId: string | null
  step: WizardFormStep
  wizardValues: Record<string, string>
}): Array<{ key: string; defaultValue: string; label: string }> {
  const rows = mappingsFor(contractTypeId, roleId, step.id)
  const stepKeys = new Set(step.fields.map((f) => f.key))
  const byUserKey = new Map<string, { key: string; defaultValue: string; label: string }>()
  for (const { wizardKey, userKeys } of rows) {
    if (!stepKeys.has(wizardKey) || userKeys.length === 0) continue
    const primary = userKeys[0]
    if (!primary) continue
    const wv = wizardValues[wizardKey]
    if (typeof wv !== 'string' || !wv.trim()) continue
    byUserKey.set(primary, {
      key: primary,
      defaultValue: wv.trim(),
      label: DEFAULT_LABEL_BY_KEY[primary] ?? primary,
    })
  }
  return [...byUserKey.values()]
}

export function hasAnyProfileValue(customFields: UserCustomField[]): boolean {
  return customFields.some((f) => typeof f.defaultValue === 'string' && f.defaultValue.trim().length > 0)
}
