import type { Meta, StoryObj } from '@storybook/react'
import { useState } from 'react'
import {
  Toast,
  Alert,
  Spinner,
  SpinnerOverlay,
  Progress,
  CircularProgress,
  Skeleton,
  SkeletonText,
  SkeletonCard,
  SkeletonList,
} from './index'
import { Button } from '@components/Button'

const meta: Meta = {
  title: 'Components/Feedback',
  parameters: {
    layout: 'centered',
  },
  tags: ['autodocs'],
}

export default meta

/**
 * Toast - Success variant
 */
export const ToastSuccess: StoryObj = {
  render: () => {
    const [show, setShow] = useState(true)

    return (
      <div className="w-96">
        <Button onClick={() => setShow(true)} disabled={show} className="mb-4">
          Show Toast
        </Button>
        <Toast
          show={show}
          variant="success"
          title="Success"
          message="Your changes have been saved successfully."
          onClose={() => setShow(false)}
        />
      </div>
    )
  },
}

/**
 * Toast - All variants
 */
export const ToastVariants: StoryObj = {
  render: () => {
    const [showSuccess, setShowSuccess] = useState(false)
    const [showError, setShowError] = useState(false)
    const [showWarning, setShowWarning] = useState(false)
    const [showInfo, setShowInfo] = useState(false)

    return (
      <div className="w-96 space-y-4">
        <div className="flex gap-2">
          <Button size="sm" onClick={() => setShowSuccess(true)}>
            Success
          </Button>
          <Button size="sm" onClick={() => setShowError(true)}>
            Error
          </Button>
          <Button size="sm" onClick={() => setShowWarning(true)}>
            Warning
          </Button>
          <Button size="sm" onClick={() => setShowInfo(true)}>
            Info
          </Button>
        </div>

        <div className="space-y-3">
          <Toast
            show={showSuccess}
            variant="success"
            title="Success"
            message="Operation completed successfully."
            onClose={() => setShowSuccess(false)}
          />
          <Toast
            show={showError}
            variant="error"
            title="Error"
            message="An error occurred while processing your request."
            onClose={() => setShowError(false)}
          />
          <Toast
            show={showWarning}
            variant="warning"
            title="Warning"
            message="Please review your changes before proceeding."
            onClose={() => setShowWarning(false)}
          />
          <Toast
            show={showInfo}
            variant="info"
            title="Info"
            message="New updates are available."
            onClose={() => setShowInfo(false)}
          />
        </div>
      </div>
    )
  },
}

/**
 * Toast - Without dismiss button
 */
export const ToastNoDismiss: StoryObj = {
  render: () => (
    <div className="w-96">
      <Toast
        show={true}
        variant="info"
        title="Processing"
        message="Your request is being processed..."
        dismissible={false}
      />
    </div>
  ),
}

/**
 * Toast - Simple message only
 */
export const ToastSimple: StoryObj = {
  render: () => {
    const [show, setShow] = useState(true)

    return (
      <div className="w-96">
        <Toast
          show={show}
          variant="success"
          message="Document uploaded successfully!"
          onClose={() => setShow(false)}
        />
      </div>
    )
  },
}

/**
 * Alert - All variants
 */
export const AlertVariants: StoryObj = {
  render: () => (
    <div className="w-full max-w-2xl space-y-4">
      <Alert variant="success" title="Success">
        Your document has been uploaded and is now being processed.
      </Alert>

      <Alert variant="error" title="Error">
        Failed to upload document. Please check the file format and try again.
      </Alert>

      <Alert variant="warning" title="Warning">
        Your session will expire in 5 minutes. Please save your work.
      </Alert>

      <Alert variant="info" title="Info">
        System maintenance is scheduled for tonight at 11 PM EST.
      </Alert>
    </div>
  ),
}

/**
 * Alert - Dismissible
 */
export const AlertDismissible: StoryObj = {
  render: () => (
    <div className="w-full max-w-2xl space-y-4">
      <Alert variant="warning" title="Cookie Policy" dismissible>
        We use cookies to improve your experience. By using our site, you agree to our cookie
        policy.
      </Alert>

      <Alert variant="info" title="New Feature" dismissible>
        Check out our new document sharing feature! Click here to learn more.
      </Alert>
    </div>
  ),
}

/**
 * Alert - With actions
 */
export const AlertWithActions: StoryObj = {
  render: () => (
    <div className="w-full max-w-2xl space-y-4">
      <Alert
        variant="warning"
        title="Confirm Action"
        actions={
          <div className="flex gap-2">
            <Button size="sm" variant="primary">
              Confirm
            </Button>
            <Button size="sm" variant="ghost">
              Cancel
            </Button>
          </div>
        }
      >
        Are you sure you want to delete this document? This action cannot be undone.
      </Alert>

      <Alert
        variant="info"
        title="Update Available"
        actions={
          <div className="flex gap-2">
            <Button size="sm" variant="primary">
              Update Now
            </Button>
            <Button size="sm" variant="ghost">
              Remind Me Later
            </Button>
          </div>
        }
      >
        A new version of the application is available.
      </Alert>
    </div>
  ),
}

/**
 * Alert - Without icon
 */
export const AlertNoIcon: StoryObj = {
  render: () => (
    <div className="w-full max-w-2xl">
      <Alert variant="info" hideIcon>
        This is a simple alert without an icon.
      </Alert>
    </div>
  ),
}

/**
 * Spinner - All sizes
 */
export const SpinnerSizes: StoryObj = {
  render: () => (
    <div className="flex items-center gap-8">
      <Spinner size="xs" />
      <Spinner size="sm" />
      <Spinner size="md" />
      <Spinner size="lg" />
      <Spinner size="xl" />
    </div>
  ),
}

/**
 * Spinner - All variants
 */
export const SpinnerVariants: StoryObj = {
  render: () => (
    <div className="flex items-center gap-8">
      <Spinner variant="primary" size="lg" />
      <Spinner variant="secondary" size="lg" />
      <Spinner variant="gray" size="lg" />
      <div className="bg-gray-800 p-4 rounded">
        <Spinner variant="white" size="lg" />
      </div>
    </div>
  ),
}

/**
 * Spinner - In button
 */
export const SpinnerInButton: StoryObj = {
  render: () => (
    <div className="flex gap-4">
      <Button disabled>
        <Spinner size="sm" variant="white" />
        <span className="ml-2">Processing...</span>
      </Button>

      <Button variant="secondary" disabled>
        <Spinner size="sm" variant="primary" />
        <span className="ml-2">Loading...</span>
      </Button>
    </div>
  ),
}

/**
 * Spinner - Overlay
 */
export const SpinnerOverlayExample: StoryObj = {
  render: () => {
    const [show, setShow] = useState(false)

    return (
      <div>
        <Button onClick={() => setShow(true)}>Show Overlay</Button>
        <SpinnerOverlay show={show} label="Processing your request..." opacity="medium" />
        {show && (
          <Button onClick={() => setShow(false)} className="ml-4">
            Hide Overlay
          </Button>
        )}
      </div>
    )
  },
}

/**
 * Progress - Linear variants
 */
export const ProgressLinear: StoryObj = {
  render: () => (
    <div className="w-full max-w-md space-y-6">
      <Progress value={25} variant="primary" showLabel label="Uploading..." />
      <Progress value={50} variant="success" showLabel label="Processing..." />
      <Progress value={75} variant="warning" showLabel label="Almost there..." />
      <Progress value={100} variant="success" showLabel label="Complete" />
    </div>
  ),
}

/**
 * Progress - Sizes
 */
export const ProgressSizes: StoryObj = {
  render: () => (
    <div className="w-full max-w-md space-y-6">
      <Progress value={65} size="sm" showLabel label="Small" />
      <Progress value={65} size="md" showLabel label="Medium" />
      <Progress value={65} size="lg" showLabel label="Large" />
    </div>
  ),
}

/**
 * Progress - Indeterminate
 */
export const ProgressIndeterminate: StoryObj = {
  render: () => (
    <div className="w-full max-w-md space-y-6">
      <Progress indeterminate variant="primary" label="Loading..." />
      <Progress indeterminate variant="info" label="Processing..." />
    </div>
  ),
}

/**
 * Progress - Striped and animated
 */
export const ProgressStriped: StoryObj = {
  render: () => (
    <div className="w-full max-w-md space-y-6">
      <Progress value={65} striped showLabel label="Striped" />
      <Progress value={65} striped animated showLabel label="Striped & Animated" />
    </div>
  ),
}

/**
 * Circular Progress - All sizes
 */
export const CircularProgressSizes: StoryObj = {
  render: () => (
    <div className="flex items-center gap-8">
      <CircularProgress value={75} size="sm" showLabel />
      <CircularProgress value={75} size="md" showLabel />
      <CircularProgress value={75} size="lg" showLabel />
      <CircularProgress value={75} size="xl" showLabel />
    </div>
  ),
}

/**
 * Circular Progress - Variants
 */
export const CircularProgressVariants: StoryObj = {
  render: () => (
    <div className="flex items-center gap-8">
      <CircularProgress value={25} variant="error" size="lg" showLabel />
      <CircularProgress value={50} variant="warning" size="lg" showLabel />
      <CircularProgress value={75} variant="info" size="lg" showLabel />
      <CircularProgress value={100} variant="success" size="lg" showLabel />
    </div>
  ),
}

/**
 * Circular Progress - Indeterminate
 */
export const CircularProgressIndeterminate: StoryObj = {
  render: () => (
    <div className="flex items-center gap-8">
      <CircularProgress indeterminate size="md" variant="primary" />
      <CircularProgress indeterminate size="lg" variant="secondary" />
    </div>
  ),
}

/**
 * Skeleton - Basic variants
 */
export const SkeletonVariants: StoryObj = {
  render: () => (
    <div className="w-full max-w-md space-y-4">
      <Skeleton variant="text" width="100%" />
      <Skeleton variant="text" width="80%" />
      <Skeleton variant="text" width="60%" />

      <div className="flex items-center gap-3 pt-4">
        <Skeleton variant="circular" width={48} height={48} />
        <div className="flex-1 space-y-2">
          <Skeleton variant="text" width="70%" />
          <Skeleton variant="text" width="40%" />
        </div>
      </div>

      <Skeleton variant="rectangular" height={200} className="rounded-lg mt-4" />
      <Skeleton variant="rounded" height={120} />
    </div>
  ),
}

/**
 * Skeleton - Text lines
 */
export const SkeletonTextExample: StoryObj = {
  render: () => (
    <div className="w-full max-w-md space-y-6">
      <div>
        <h3 className="text-sm font-semibold mb-2">3 lines</h3>
        <SkeletonText lines={3} />
      </div>

      <div>
        <h3 className="text-sm font-semibold mb-2">5 lines</h3>
        <SkeletonText lines={5} />
      </div>

      <div>
        <h3 className="text-sm font-semibold mb-2">Custom last line width</h3>
        <SkeletonText lines={4} lastLineWidth="40%" />
      </div>
    </div>
  ),
}

/**
 * Skeleton - Card layouts
 */
export const SkeletonCardExample: StoryObj = {
  render: () => (
    <div className="grid grid-cols-1 md:grid-cols-2 gap-4 w-full max-w-4xl">
      <SkeletonCard />
      <SkeletonCard showImage={false} showAvatar />
      <SkeletonCard showActions={false} />
      <SkeletonCard showImage={false} textLines={5} />
    </div>
  ),
}

/**
 * Skeleton - List items
 */
export const SkeletonListExample: StoryObj = {
  render: () => (
    <div className="w-full max-w-2xl space-y-8">
      <div>
        <h3 className="text-sm font-semibold mb-3">With avatars</h3>
        <SkeletonList items={3} showAvatar />
      </div>

      <div>
        <h3 className="text-sm font-semibold mb-3">Without avatars</h3>
        <SkeletonList items={3} showAvatar={false} />
      </div>
    </div>
  ),
}

/**
 * Skeleton - Loading state example
 */
export const SkeletonLoadingExample: StoryObj = {
  render: () => {
    const [loading, setLoading] = useState(true)

    return (
      <div className="w-full max-w-2xl">
        <Button onClick={() => setLoading(!loading)} className="mb-4">
          {loading ? 'Show Content' : 'Show Loading'}
        </Button>

        {loading ? (
          <SkeletonCard showAvatar textLines={4} />
        ) : (
          <div className="rounded-lg border border-gray-200 dark:border-gray-800 bg-white dark:bg-gray-900 p-4">
            <div className="flex items-center gap-3 mb-4">
              <img
                src="https://via.placeholder.com/40"
                alt="Avatar"
                className="h-10 w-10 rounded-full"
              />
              <div>
                <h3 className="font-semibold text-gray-900 dark:text-gray-100">John Doe</h3>
                <p className="text-sm text-gray-500 dark:text-gray-400">2 hours ago</p>
              </div>
            </div>

            <h2 className="text-xl font-semibold text-gray-900 dark:text-gray-100 mb-3">
              Financial Report Q4 2024
            </h2>

            <p className="text-gray-700 dark:text-gray-300 mb-4">
              This document contains the comprehensive financial analysis for Q4 2024, including
              revenue projections, expense breakdowns, and strategic recommendations for the
              upcoming fiscal year.
            </p>

            <div className="flex gap-2">
              <Button size="sm">View Details</Button>
              <Button size="sm" variant="ghost">
                Download
              </Button>
            </div>
          </div>
        )}
      </div>
    )
  },
}

/**
 * Document upload progress example
 */
export const DocumentUploadExample: StoryObj = {
  render: () => {
    const [progress, setProgress] = useState(0)
    const [uploading, setUploading] = useState(false)

    const startUpload = () => {
      setUploading(true)
      setProgress(0)

      const interval = setInterval(() => {
        setProgress((prev) => {
          if (prev >= 100) {
            clearInterval(interval)
            setTimeout(() => {
              setUploading(false)
              setProgress(0)
            }, 1000)
            return 100
          }
          return prev + 10
        })
      }, 300)
    }

    return (
      <div className="w-full max-w-md space-y-4">
        <Button onClick={startUpload} disabled={uploading} fullWidth>
          {uploading ? 'Uploading...' : 'Upload Document'}
        </Button>

        {uploading && (
          <div className="space-y-2">
            <Progress
              value={progress}
              variant={progress === 100 ? 'success' : 'primary'}
              showLabel
              label={progress === 100 ? 'Upload complete!' : 'Uploading document...'}
            />
          </div>
        )}

        {progress === 100 && (
          <Alert variant="success" title="Success">
            Your document has been uploaded successfully.
          </Alert>
        )}
      </div>
    )
  },
}
