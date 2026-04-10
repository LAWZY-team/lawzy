const SUPPORTED_EXTENSIONS = ['.pdf', '.docx'] as const

const getNormalizedExtension = (fileName: string): string => {
  const lower = fileName.toLowerCase()
  const matched = SUPPORTED_EXTENSIONS.find((extension) => lower.endsWith(extension))
  return matched ?? ''
}

export const communityContractTemplateFile = {
  accept: '.pdf,.docx,application/pdf,application/vnd.openxmlformats-officedocument.wordprocessingml.document',
  isSupported(fileName: string): boolean {
    return getNormalizedExtension(fileName) !== ''
  },
  isPdf(fileName: string): boolean {
    return getNormalizedExtension(fileName) === '.pdf'
  },
  isDocx(fileName: string): boolean {
    return getNormalizedExtension(fileName) === '.docx'
  },
  getTypeLabel(fileName: string): string {
    const extension = getNormalizedExtension(fileName)
    if (extension === '.pdf') return 'PDF'
    if (extension === '.docx') return 'DOCX'
    return 'FILE'
  },
} as const
