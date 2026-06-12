import { Tabs } from "@radix-ui/react-tabs"
import { toast } from "sonner"
import { TabsList } from "./ui/tabs"
import { TabsTrigger } from "./ui/tabs"

export const SelectTabs = ({
	tabs,
	defaultValue,
	value,
	onValueChange,
}: {
	tabs: { label: string; value: string }[]
	defaultValue: string
	/** 传入则为受控（选中态反映该值）；不传则沿用 defaultValue 的非受控行为。 */
	value?: string
	onValueChange: (value: string) => void
}) => {
	return (
		<Tabs
			{...(value !== undefined ? { value } : { defaultValue })}
			onValueChange={(value) => {
				onValueChange(value)
			}}
		>
			<TabsList>
				{tabs.map((tab) => (
					<TabsTrigger key={tab.value} value={tab.value}>
						{tab.label}
					</TabsTrigger>
				))}
			</TabsList>
		</Tabs>
	)
}

export const PerformanceModeSelectTabs = ({
	name,
	defaultValue,
	value,
	onValueChange,
	showToast = true,
}: {
	name: string
	defaultValue: string
	/** 传入则为受控（选中态反映该值，便于 ack 失败时不误显示新选项）。 */
	value?: string
	onValueChange: (value: string) => void
	showToast?: boolean
}) => {
	const performanceModes = {
		ECONOMY: "经济",
		EQUAL: "均衡",
		PERFORMANCE: "性能",
	}
	const tabs = Object.keys(performanceModes).map((mode) => ({
		label: performanceModes[mode],
		value: mode,
	}))

	return (
		<SelectTabs
			tabs={tabs}
			defaultValue={defaultValue}
			value={value}
			onValueChange={(value) => {
				onValueChange(value)
				if (showToast) {
					toast.success(`${name}性能模式设置为${performanceModes[value]}`)
				}
			}}
		/>
	)
}
