import type { Meta, StoryObj } from '@storybook/react-vite'
import { StepProgressBar } from './StepProgressBar'

const meta: Meta<typeof StepProgressBar> = {
  title: 'Training/StepProgressBar',
  component: StepProgressBar,
  parameters: { layout: 'padded' },
  tags: ['autodocs'],
}

export default meta
type Story = StoryObj<typeof StepProgressBar>

export const ZeroPercent: Story = { args: { completedCount: 0, totalCount: 10 } }
export const TwentyFivePercent: Story = { args: { completedCount: 1, totalCount: 4 } }
export const FiftyPercent: Story = { args: { completedCount: 3, totalCount: 6 } }
export const SeventyFivePercent: Story = { args: { completedCount: 3, totalCount: 4 } }
export const HundredPercent: Story = { args: { completedCount: 5, totalCount: 5 } }

/**
 * All progress levels
 */
export const AllLevels: Story = {
  render: () => (
    <div className="space-y-4 max-w-lg">
      <StepProgressBar completedCount={0} totalCount={8} />
      <StepProgressBar completedCount={2} totalCount={8} />
      <StepProgressBar completedCount={4} totalCount={8} />
      <StepProgressBar completedCount={6} totalCount={8} />
      <StepProgressBar completedCount={8} totalCount={8} />
    </div>
  ),
}
