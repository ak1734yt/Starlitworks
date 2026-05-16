import { Server, Bot, Users, Activity } from "lucide-react";

export const STATS_DATA = [
  { 
    label: "Servers Built", 
    value: "20+", 
    icon: Server,
    color: "from-violet-500 to-fuchsia-500" 
  },
  { 
    label: "Bots Deployed", 
    value: "10+", 
    icon: Bot,
    color: "from-blue-500 to-cyan-500" 
  },
  { 
    label: "Happy Clients", 
    value: "40+", 
    icon: Users,
    color: "from-emerald-500 to-teal-500" 
  },
  { 
    label: "Uptime Guarantee", 
    value: "99.9%", 
    icon: Activity,
    color: "from-orange-500 to-amber-500" 
  }
];
