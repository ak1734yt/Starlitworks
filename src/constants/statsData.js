import { Server, Bot, Users, Code, Wrench, Shield, Clock } from "lucide-react";

export const STATS_DATA = [
  { 
    label: "Bots Developed", 
    value: "10+", 
    icon: Bot,
    color: "from-violet-500 to-fuchsia-500",
    key: "bots_developed"
  },
  { 
    label: "Servers Built", 
    value: "20+", 
    icon: Server,
    color: "from-blue-500 to-cyan-500",
    key: "dev_servers"
  },
  { 
    label: "Total Users", 
    value: "9,843+", 
    icon: Users,
    color: "from-emerald-500 to-teal-500",
    key: "member_count"
  },
  { 
    label: "Commands Written", 
    value: "900+", 
    icon: Code,
    color: "from-orange-500 to-amber-500",
    key: "commands_written"
  },
  { 
    label: "Projects Delivered", 
    value: "50+", 
    icon: Wrench,
    color: "from-pink-500 to-rose-500",
    key: "projects_developed"
  },
  { 
    label: "Uptime", 
    value: "99.9%", 
    icon: Shield,
    color: "from-teal-500 to-emerald-500",
    key: "uptime"
  },
  { 
    label: "Expert Support", 
    value: "24/7", 
    icon: Clock,
    color: "from-indigo-500 to-purple-500",
    key: "support"
  }
];
