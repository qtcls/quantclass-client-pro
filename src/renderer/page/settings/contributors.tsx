import {
	Avatar,
	AvatarFallback,
	AvatarImage,
} from "@/renderer/components/ui/avatar"
import { Separator } from "@/renderer/components/ui/separator"
import {
	contributors2026,
	contributorsBefore2026,
} from "@/renderer/constant/contributors"
import { cn } from "@/renderer/lib/utils"

const { openUrl } = window.electronAPI

const ContributorCard = ({
	name,
	avatar,
	homepage,
	gourd,
}: {
	name: string
	avatar: string
	homepage: string
	gourd?: number
}) => {
	return (
		<div
			className="flex items-center gap-4  hover:underline hover:cursor-pointer"
			onClick={() => openUrl(homepage)}
		>
			<Avatar>
				<AvatarImage src={avatar} alt={name} />
				<AvatarFallback>{name[0]}</AvatarFallback>
			</Avatar>
			<div
				className={cn(
					"grid flex-1 text-left text-sm leading-tight",
					gourd === 1
						? "text-amber-500 dark:text-amber-300"
						: "text-gray-500 dark:text-gray-300",
				)}
			>
				<span className="truncate font-semibold">{name}</span>
				{gourd && (
					<div
						className={cn(
							"text-xs text-muted-foreground",
							gourd === 1
								? "text-amber-400 dark:text-amber-700"
								: "text-gray-400 dark:text-gray-500",
						)}
					>
						赠予 {gourd ?? 10} 个{gourd === 1 ? "金葫芦" : "银葫芦"}
					</div>
				)}
			</div>
		</div>
	)
}
function ContributorSection({
	title,
	contributors,
}: {
	title: string
	contributors: {
		name: string
		avatar: string
		homepage: string
		gourd?: number
	}[]
}) {
	return (
		<div className="flex flex-col gap-3">
			<div className="text-muted-foreground text-sm font-medium">{title}</div>
			<div className="grid grid-cols-4 gap-4">
				{contributors.map((item) => (
					<ContributorCard key={item.name} {...item} />
				))}
			</div>
		</div>
	)
}

const Contributors = () => {
	return (
		<div className="flex flex-col gap-4">
			<div className="text-muted-foreground text-sm">
				感谢以下同学参与到客户端的开发、测试中来 (以下排名不分先后)
			</div>

			<ContributorSection title="2026" contributors={contributors2026} />

			<Separator />

			<ContributorSection
				title="2026之前"
				contributors={contributorsBefore2026}
			/>
		</div>
	)
}

export default Contributors
