import {
  LayoutDashboard,
  BookOpen,
  Users,
  Radio,
  FileText,
  Trophy,
  Settings,
  Home,
  Globe,
  Palette
} from "lucide-react"

export const TEACHER_MENU = [
  {
    label: "Dashboard",
    href: "/management/dashboard",
    icon: LayoutDashboard
  },
  {
    label: "Live Monitor",
    href: "/management/monitoring",
    icon: Radio,
    activeColor: "text-red-500" // 특별 강조
  },
  {
    label: "Assignments",
    href: "/management/assignments",
    icon: FileText
  },
  {
    label: "Content",
    href: "/management/content",
    icon: BookOpen
  },
  {
    label: "Students",
    href: "/management/students",
    icon: Users
  },
  {
    label: "My Account", // TEACHER_MENU 에 My Account 추가
    href: "/account",
    icon: Settings
  }
]

export const STUDENT_MENU = [
  {
    label: "Home",
    href: "/dashboard",
    icon: Home
  },
  {
    label: "World",
    href: "/world",
    icon: Globe
  },
  {
    label: "Sprite Maker",
    href: "/sprite-maker",
    icon: Palette
  },
  {
    label: "Assignments",
    href: "/assignments",
    icon: FileText,
    badge: true // 배지 표시 여부
  },
  {
    label: "My Account",
    href: "/account",
    icon: Settings
  }
]
