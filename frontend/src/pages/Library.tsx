import { useState } from 'react'
import { useNavigate } from 'react-router-dom'
import type { LibraryTab } from '../components/library/LibraryTabs'
import { useAuth } from '../hooks/useAuth'
import { useIsAdmin } from '../hooks/useIsAdmin'
import { useLibraryTexts } from '../hooks/useLibraryTexts'
import { useLibraryFilters } from '../hooks/useLibraryFilters'
import { useComplexitySlider } from '../hooks/useComplexitySlider'
import { useLibraryTextActions } from '../hooks/useLibraryTextActions'
import { useLibraryPublicTexts } from '../hooks/useLibraryPublicTexts'
import { useLibraryBestScores } from '../hooks/useLibraryBestScores'
import { useAutoClearMessage } from '../hooks/useAutoClearMessage'
import { useLibraryFilterHandlers } from '../hooks/useLibraryFilterHandlers'
import { useLibraryPagination } from '../hooks/useLibraryPagination'
import { UploadTextModal } from '../components/UploadTextModal'
import { EditTextModal } from '../components/EditTextModal'
import { ConfirmDialog } from '../components/ConfirmDialog'
import { LibraryFilters } from '../components/library/LibraryFilters'
import { LibraryHeader } from '../components/library/LibraryHeader'
import { LibraryTabs } from '../components/library/LibraryTabs'
import { LibraryPagination } from '../components/library/LibraryPagination'
import { LibraryAlerts } from '../components/library/LibraryAlerts'
import { LibraryContent } from '../components/library/LibraryContent'
import { SUCCESS_MESSAGE_DURATION_MS } from '../constants/ui'
import { TEXTS_PER_PAGE } from '../constants/library'

export function Library() {
  const { user } = useAuth()
  const isAdmin = useIsAdmin()
  const navigate = useNavigate()
  const [activeTab, setActiveTab] = useState<LibraryTab>('private')
  const [isModalOpen, setIsModalOpen] = useState(false)
  const [successMessage, setSuccessMessage] = useState<string | null>(null)
  const [deleteError, setDeleteError] = useState<string | null>(null)
  const [showFilters, setShowFilters] = useState(false)

  const {
    texts: privateTexts,
    loading: privateLoading,
    error: privateError,
    setTexts: setPrivateTexts,
  } = useLibraryTexts(user?.id ?? null)

  const { publicTexts, publicLoading, publicError, refetchPublicTexts } =
    useLibraryPublicTexts(activeTab)

  const currentTexts = activeTab === 'private' ? privateTexts : publicTexts

  const {
    searchQuery,
    filters,
    sortBy,
    sortDirection,
    handleSearchChange: handleFilterSearchChange,
    handleResetSearch: handleFilterResetSearch,
    setGenreFilter,
    setSortBy,
    toggleSortDirection,
    clearFilters,
    setFilters,
    sortedAndFilteredTexts,
    hasActiveFilters,
  } = useLibraryFilters(currentTexts)

  const {
    resetPage,
    totalPages,
    validatedCurrentPage,
    paginatedItems: paginatedTexts,
    jumpToPage,
    jumpToPageInputRef,
    handlePreviousPage,
    handleNextPage,
    handleJumpInputKeyDown,
    handleJumpInputChange,
    handleJumpInputFocus,
    handleJumpInputBlur,
  } = useLibraryPagination(sortedAndFilteredTexts, TEXTS_PER_PAGE)

  const { sliderRef: complexitySliderRef, resetSlider } = useComplexitySlider({
    showFilters,
    filters,
    setFilters,
    onPageReset: resetPage,
  })

  const {
    deleteConfirm,
    editModal,
    retryingTextIds,
    handleUpload,
    handleDeleteClick,
    handleDeleteConfirm,
    handleDeleteCancel,
    handleRetryProcessing,
    handleEditClick,
    handleEditClose,
    handleEditSubmit,
    handleMakePublicCopy,
    handleReadText,
  } = useLibraryTextActions({
    userId: user?.id ?? null,
    navigate,
    setPrivateTexts,
    setSuccessMessage,
    setDeleteError,
    activeTab,
    refetchPublicTexts,
  })

  const bestScores = useLibraryBestScores(user?.id ?? null, activeTab)

  const {
    handleSearchChange,
    handleResetSearch,
    handleGenreChange,
    handleSortChange,
    handleClearFilters,
  } = useLibraryFilterHandlers({
    handleFilterSearchChange,
    handleFilterResetSearch,
    setGenreFilter,
    setSortBy,
    clearFilters,
    resetSlider,
    onPageReset: resetPage,
  })

  useAutoClearMessage(
    successMessage,
    setSuccessMessage,
    SUCCESS_MESSAGE_DURATION_MS
  )
  useAutoClearMessage(deleteError, setDeleteError, SUCCESS_MESSAGE_DURATION_MS)

  const loading = activeTab === 'private' ? privateLoading : publicLoading
  const fetchError = activeTab === 'private' ? privateError : publicError
  const isInitialLoad =
    (activeTab === 'private' && privateTexts === null) ||
    (activeTab === 'public' && publicTexts === null)

  return (
    <div className="flex flex-1 flex-col items-center w-full px-8 py-6 overflow-y-auto">
      <div className="w-full max-w-4xl">
        <LibraryHeader
          activeTab={activeTab}
          showUpload={Boolean(user && activeTab === 'private')}
          onUpload={() => setIsModalOpen(true)}
        />

        <LibraryTabs
          activeTab={activeTab}
          onTabChange={(tab) => {
            setActiveTab(tab)
            resetPage()
          }}
        />

        <LibraryAlerts
          successMessage={successMessage}
          errorMessage={fetchError || deleteError}
        />

        {!isInitialLoad && (
          <LibraryFilters
            searchQuery={searchQuery}
            onSearchChange={handleSearchChange}
            onResetSearch={handleResetSearch}
            showFilters={showFilters}
            onToggleFilters={() => setShowFilters((prev) => !prev)}
            sortBy={sortBy}
            sortDirection={sortDirection}
            onSortChange={handleSortChange}
            onToggleSortDirection={toggleSortDirection}
            filters={filters}
            onGenreChange={handleGenreChange}
            onClearFilters={handleClearFilters}
            hasActiveFilters={hasActiveFilters}
            resultsCount={sortedAndFilteredTexts.length}
            sliderRef={complexitySliderRef}
          />
        )}

        <LibraryContent
          activeTab={activeTab}
          user={user}
          loading={loading}
          isInitialLoad={isInitialLoad}
          hasActiveFilters={hasActiveFilters}
          paginatedTexts={paginatedTexts}
          bestScores={bestScores}
          retryingTextIds={retryingTextIds}
          onReadText={handleReadText}
          onRetryProcessing={handleRetryProcessing}
          onEditText={handleEditClick}
          onDeleteText={handleDeleteClick}
          isAdmin={isAdmin}
        />
      </div>

      <LibraryPagination
        currentPage={validatedCurrentPage}
        totalPages={totalPages}
        jumpToPage={jumpToPage}
        jumpToPageInputRef={jumpToPageInputRef}
        onPrevPage={handlePreviousPage}
        onNextPage={handleNextPage}
        onJumpInputKeyDown={handleJumpInputKeyDown}
        onJumpInputChange={handleJumpInputChange}
        onJumpInputFocus={handleJumpInputFocus}
        onJumpInputBlur={handleJumpInputBlur}
      />

      <UploadTextModal
        isOpen={isModalOpen}
        onClose={() => setIsModalOpen(false)}
        onSubmit={handleUpload}
      />

      <EditTextModal
        isOpen={editModal.isOpen}
        text={editModal.text}
        onClose={handleEditClose}
        onSubmit={handleEditSubmit}
        onMakePublicCopy={handleMakePublicCopy}
      />

      <ConfirmDialog
        isOpen={deleteConfirm.isOpen}
        title="Delete Text"
        message="Are you sure you want to delete this text? This action cannot be undone."
        confirmLabel="Delete"
        cancelLabel="Cancel"
        onConfirm={handleDeleteConfirm}
        onCancel={handleDeleteCancel}
        isDestructive
      />
    </div>
  )
}
