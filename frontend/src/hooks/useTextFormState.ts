import { useEffect, useCallback, useRef, useReducer } from 'react'
import type { TextInput, SectionData } from '../types/database'
import { MAX_SECTIONS } from '../constants/textUpload'
import { sectionHasContent } from '../utils/textFormValidation'

interface UseTextFormStateProps {
  isOpen: boolean
  mode: 'upload' | 'edit'
  initialData?: TextInput
}

interface FormState {
  title: string
  content: string
  fiction: boolean
  isSectional: boolean
  sections: SectionData[]
  isSubmitting: boolean
  isMakingPublicCopy: boolean
  error: string | null
  showUnsavedWarning: boolean
  showDeleteWarning: boolean
  sectionToDelete: number | null
}

type FormAction =
  | { type: 'setTitle'; payload: string }
  | { type: 'setContent'; payload: string }
  | { type: 'setFiction'; payload: boolean }
  | { type: 'setIsSectional'; payload: boolean }
  | { type: 'setSections'; payload: SectionData[] }
  | { type: 'setIsSubmitting'; payload: boolean }
  | { type: 'setIsMakingPublicCopy'; payload: boolean }
  | { type: 'setError'; payload: string | null }
  | { type: 'setShowUnsavedWarning'; payload: boolean }
  | { type: 'confirmDeleteSection' }
  | { type: 'cancelDeleteSection' }
  | { type: 'requestDeleteSection'; payload: number }
  | {
      type: 'initializeForm'
      payload: Omit<FormState, 'isSubmitting' | 'isMakingPublicCopy'>
    }

function formReducer(state: FormState, action: FormAction): FormState {
  switch (action.type) {
    case 'setTitle':
      return { ...state, title: action.payload }
    case 'setContent':
      return { ...state, content: action.payload }
    case 'setFiction':
      return { ...state, fiction: action.payload }
    case 'setIsSectional':
      return { ...state, isSectional: action.payload }
    case 'setSections':
      return { ...state, sections: action.payload }
    case 'setIsSubmitting':
      return { ...state, isSubmitting: action.payload }
    case 'setIsMakingPublicCopy':
      return { ...state, isMakingPublicCopy: action.payload }
    case 'setError':
      return { ...state, error: action.payload }
    case 'setShowUnsavedWarning':
      return { ...state, showUnsavedWarning: action.payload }
    case 'requestDeleteSection':
      return {
        ...state,
        sectionToDelete: action.payload,
        showDeleteWarning: true,
      }
    case 'confirmDeleteSection':
      if (state.sectionToDelete === null) return state
      return {
        ...state,
        sections: state.sections.filter((_, i) => i !== state.sectionToDelete),
        sectionToDelete: null,
        showDeleteWarning: false,
      }
    case 'cancelDeleteSection':
      return {
        ...state,
        sectionToDelete: null,
        showDeleteWarning: false,
      }
    case 'initializeForm':
      return {
        ...state,
        title: action.payload.title,
        content: action.payload.content,
        fiction: action.payload.fiction,
        isSectional: action.payload.isSectional,
        sections: action.payload.sections,
        error: action.payload.error,
        showUnsavedWarning: action.payload.showUnsavedWarning,
        showDeleteWarning: action.payload.showDeleteWarning,
        sectionToDelete: action.payload.sectionToDelete,
      }
    default: {
      const _exhaustive: never = action
      return _exhaustive
    }
  }
}

interface UseTextFormStateReturn {
  title: string
  setTitle: (title: string) => void
  content: string
  setContent: (content: string) => void
  fiction: boolean
  setFiction: (fiction: boolean) => void
  isSectional: boolean
  setIsSectional: (isSectional: boolean) => void
  sections: SectionData[]
  setSections: (sections: SectionData[]) => void

  isSubmitting: boolean
  setIsSubmitting: (isSubmitting: boolean) => void
  isMakingPublicCopy: boolean
  setIsMakingPublicCopy: (isMakingPublicCopy: boolean) => void
  error: string | null
  setError: (error: string | null) => void

  showUnsavedWarning: boolean
  setShowUnsavedWarning: (show: boolean) => void
  showDeleteWarning: boolean
  sectionToDelete: number | null

  hasUnsavedChanges: boolean

  addSection: () => void
  removeSection: (index: number) => void
  updateSection: (
    index: number,
    field: keyof SectionData,
    value: string
  ) => void
  confirmDeleteSection: () => void
  cancelDeleteSection: () => void
}

/**
 * Helper function to get default section content
 */
const getDefaultSectionContent = (): SectionData[] => [
  { title: '', content: '' },
]

/**
 * Helper function to safely get section content
 */
const getSectionContent = (data: TextInput | undefined): SectionData[] => {
  return data?.section_content ?? getDefaultSectionContent()
}

/**
 * Helper to get initial state based on data
 */
const getInitialFormState = (
  initialData: TextInput | undefined
): Omit<FormState, 'isSubmitting' | 'isMakingPublicCopy'> => {
  if (!initialData) {
    return {
      title: '',
      content: '',
      fiction: true,
      isSectional: false,
      sections: getDefaultSectionContent(),
      error: null,
      showUnsavedWarning: false,
      showDeleteWarning: false,
      sectionToDelete: null,
    }
  }

  const hasSectionalData =
    'sectional' in initialData && 'section_content' in initialData
  const isOriginallySectional = hasSectionalData
    ? (initialData.sectional ?? false)
    : false

  return {
    title: initialData.title || '',
    content: initialData.content,
    fiction: initialData.fiction ?? true,
    isSectional: isOriginallySectional,
    sections:
      hasSectionalData && initialData.section_content
        ? initialData.section_content
        : getDefaultSectionContent(),
    error: null,
    showUnsavedWarning: false,
    showDeleteWarning: false,
    sectionToDelete: null,
  }
}

/**
 * Hook to manage all text form state and logic
 */
export function useTextFormState({
  isOpen,
  mode,
  initialData,
}: UseTextFormStateProps): UseTextFormStateReturn {
  const prevIsOpenRef = useRef(isOpen)
  const prevInitialDataRef = useRef(initialData)
  const isFirstRenderRef = useRef(true)

  const initialFormState: FormState = {
    title: '',
    content: '',
    fiction: true,
    isSectional: false,
    sections: getDefaultSectionContent(),
    isSubmitting: false,
    isMakingPublicCopy: false,
    error: null,
    showUnsavedWarning: false,
    showDeleteWarning: false,
    sectionToDelete: null,
  }

  const [state, dispatch] = useReducer(formReducer, initialFormState)

  useEffect(() => {
    if (!isOpen) {
      prevIsOpenRef.current = isOpen
      return
    }

    const isModalOpening = isOpen && !prevIsOpenRef.current
    const hasInitialDataChanged = initialData !== prevInitialDataRef.current
    const isFirstRender = isFirstRenderRef.current

    // Initialize form if: modal is opening, initialData changed, or first render with isOpen=true
    if (isModalOpening || hasInitialDataChanged || (isFirstRender && isOpen)) {
      const initialState = getInitialFormState(initialData)
      dispatch({ type: 'initializeForm', payload: initialState })
      isFirstRenderRef.current = false
    }

    prevIsOpenRef.current = isOpen
    prevInitialDataRef.current = initialData
  }, [isOpen, initialData])

  const hasUnsavedChanges =
    mode === 'upload'
      ? state.content.trim() !== '' ||
        state.title.trim() !== '' ||
        state.isSectional ||
        state.sections.some(
          (s) => s.title.trim() !== '' || s.content.trim() !== ''
        )
      : state.content.trim() !== initialData?.content ||
        state.title.trim() !== (initialData?.title || '') ||
        state.fiction !== (initialData?.fiction ?? true) ||
        state.isSectional !== (initialData?.sectional ?? false) ||
        JSON.stringify(state.sections) !==
          JSON.stringify(getSectionContent(initialData))

  const addSection = useCallback(() => {
    if (state.sections.length < MAX_SECTIONS) {
      dispatch({
        type: 'setSections',
        payload: [...state.sections, { title: '', content: '' }],
      })
    }
  }, [state.sections])

  const removeSection = useCallback(
    (index: number) => {
      const section = state.sections[index]
      if (sectionHasContent(section)) {
        dispatch({ type: 'requestDeleteSection', payload: index })
      } else {
        dispatch({
          type: 'setSections',
          payload: state.sections.filter((_, i) => i !== index),
        })
      }
    },
    [state.sections]
  )

  const confirmDeleteSection = useCallback(() => {
    dispatch({ type: 'confirmDeleteSection' })
  }, [])

  const cancelDeleteSection = useCallback(() => {
    dispatch({ type: 'cancelDeleteSection' })
  }, [])

  const updateSection = useCallback(
    (index: number, field: keyof SectionData, value: string) => {
      const newSections = [...state.sections]
      newSections[index] = { ...newSections[index], [field]: value }
      dispatch({ type: 'setSections', payload: newSections })
    },
    [state.sections]
  )

  // Stable setters: dispatch is stable from useReducer, so empty deps are safe
  const setTitle = useCallback(
    (title: string) => dispatch({ type: 'setTitle', payload: title }),
    []
  )
  const setContent = useCallback(
    (content: string) => dispatch({ type: 'setContent', payload: content }),
    []
  )
  const setFiction = useCallback(
    (fiction: boolean) => dispatch({ type: 'setFiction', payload: fiction }),
    []
  )
  const setIsSectional = useCallback(
    (isSectional: boolean) =>
      dispatch({ type: 'setIsSectional', payload: isSectional }),
    []
  )
  const setSections = useCallback(
    (sections: SectionData[]) =>
      dispatch({ type: 'setSections', payload: sections }),
    []
  )
  const setIsSubmitting = useCallback(
    (isSubmitting: boolean) =>
      dispatch({ type: 'setIsSubmitting', payload: isSubmitting }),
    []
  )
  const setIsMakingPublicCopy = useCallback(
    (isMakingPublicCopy: boolean) =>
      dispatch({ type: 'setIsMakingPublicCopy', payload: isMakingPublicCopy }),
    []
  )
  const setError = useCallback(
    (error: string | null) => dispatch({ type: 'setError', payload: error }),
    []
  )
  const setShowUnsavedWarning = useCallback(
    (show: boolean) =>
      dispatch({ type: 'setShowUnsavedWarning', payload: show }),
    []
  )

  return {
    title: state.title,
    setTitle,
    content: state.content,
    setContent,
    fiction: state.fiction,
    setFiction,
    isSectional: state.isSectional,
    setIsSectional,
    sections: state.sections,
    setSections,
    isSubmitting: state.isSubmitting,
    setIsSubmitting,
    isMakingPublicCopy: state.isMakingPublicCopy,
    setIsMakingPublicCopy,
    error: state.error,
    setError,
    showUnsavedWarning: state.showUnsavedWarning,
    setShowUnsavedWarning,
    showDeleteWarning: state.showDeleteWarning,
    sectionToDelete: state.sectionToDelete,
    hasUnsavedChanges,
    addSection,
    removeSection,
    updateSection,
    confirmDeleteSection,
    cancelDeleteSection,
  }
}
