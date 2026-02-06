# 🎯 METRIX - AI-Powered Goal Tracking System

**METRIX** is an intelligent goal tracking and progress management system that helps you achieve your life goals through AI-powered planning, daily progress logging, and advanced analytics.

![Version](https://img.shields.io/badge/version-1.0.0-blue.svg)
![Next.js](https://img.shields.io/badge/Next.js-16.1.4-black.svg)
![TypeScript](https://img.shields.io/badge/TypeScript-5.0-blue.svg)
![License](https://img.shields.io/badge/license-MIT-green.svg)

---

## ✨ Key Features

### 🤖 AI-Powered Goal Creation
- **Intelligent Investigation**: AI analyzes your goal and asks clarifying questions
- **Smart Planning**: Generates realistic plans with daily tasks and timelines
- **Safety Checks**: Built-in safety filters to prevent harmful content
- **Realism Assessment**: Evaluates if goals are achievable and suggests adjustments

### 📊 Progress Tracking
- **Daily Logging**: Record your daily progress with text or voice input
- **AI Evaluation**: Smart scoring system (5-15 points for normal progress, max 25 for exceptional)
- **Historical Context**: Compares current progress with past performance
- **Multilingual Support**: Automatic language detection (Arabic/English)

### 📈 Advanced Analytics
- **Week-over-Week Comparison**: Track improvement trends
- **Performance Metrics**: Average points per log, total active days
- **Predictive Analytics**: Projected completion date based on current pace
- **On-Track Status**: Know if you're ahead or behind schedule
- **Cached Results**: Analytics stored in database for optimal performance

### 📅 Weekly Summaries
- **AI-Generated Insights**: Powered by Mistral AI
- **Pattern Recognition**: Identifies your productivity patterns
- **Actionable Improvements**: Specific suggestions for next week
- **Best Day/Activity Tracking**: Highlights your peak performance

### 🎨 Goal Templates
- **Quick Start**: 6+ pre-built goal templates
- **Categories**: Fitness, Education, Career, Finance, Hobbies
- **Customizable**: Edit templates before creating goals
- **Smart Defaults**: Pre-configured tasks and timelines

### 🔥 Gamification
- **Streak System**: Track consecutive days of logging
- **Points System**: Earn points for completing tasks
- **Visual Progress**: Beautiful animated progress bars
- **Growth Charts**: Visualize your journey over time

### 🌍 Internationalization
- **Bilingual**: Full support for Arabic and English
- **RTL Support**: Automatic right-to-left layout for Arabic
- **Smart Detection**: Auto-detects language from user input
- **Consistent Responses**: AI responds in user's language

### 🎨 Modern UI/UX
- **100+ Icons**: Extensive icon library for goal customization
- **Dark/Light Mode**: System preference detection with manual toggle
- **Responsive Design**: Works perfectly on mobile, tablet, and desktop
- **Smooth Animations**: Polished transitions and micro-interactions
- **Glassmorphism**: Modern backdrop-blur effects

---

## 🏗️ Tech Stack

### Frontend
- **Framework**: [Next.js 16.1.4](https://nextjs.org/) (App Router)
- **Language**: [TypeScript 5](https://www.typescriptlang.org/)
- **UI Library**: [React 19.2.3](https://react.dev/)
- **Styling**: [Tailwind CSS 4](https://tailwindcss.com/)
- **Components**: [shadcn/ui](https://ui.shadcn.com/) + [Radix UI](https://www.radix-ui.com/)
- **Icons**: [Lucide React](https://lucide.dev/) (100+ icons)
- **Charts**: [Recharts](https://recharts.org/)
- **Fonts**: IBM Plex Sans Arabic

### Backend & AI
- **Database**: [Supabase](https://supabase.com/) (PostgreSQL + Auth + RLS)
- **AI Models**: 
  - [Google Gemini 2.5 Flash](https://ai.google.dev/) - Goal planning & daily evaluation
  - [Mistral AI](https://mistral.ai/) - Weekly summaries
- **Authentication**: Supabase Auth
- **API Routes**: Next.js API Routes

### Development Tools
- **Compiler**: React Compiler (Babel)
- **Bundler**: Turbopack
- **Linting**: ESLint 9
- **Package Manager**: npm

---

## 📁 Project Structure

```
METRIX/
├── src/
│   ├── app/
│   │   ├── api/                    # API Routes
│   │   │   ├── goal/
│   │   │   │   ├── investigate/    # Phase 1: Goal investigation
│   │   │   │   ├── plan/           # Phase 2: Plan creation
│   │   │   │   └── evaluate/       # Phase 3: Daily evaluation
│   │   │   ├── weekly-summary/     # Weekly AI summaries
│   │   │   └── analytics/          # Advanced analytics
│   │   ├── page.tsx                # Main app page
│   │   ├── layout.tsx              # Root layout
│   │   └── globals.css             # Global styles
│   │
│   ├── components/
│   │   ├── ui/                     # shadcn/ui components
│   │   ├── Dashboard.tsx           # Goal dashboard view
│   │   ├── HomePage.tsx            # Landing page
│   │   ├── GoalsList.tsx           # All goals list
│   │   ├── GoalCreator.tsx         # AI-powered goal creation
│   │   ├── ManualGoalCreator.tsx   # Manual goal creation
│   │   ├── GoalTemplates.tsx       # Pre-built goal templates
│   │   ├── DailyLogModal.tsx       # Daily progress logging
│   │   ├── ActivityHistory.tsx     # Progress history
│   │   ├── WeeklySummaryCard.tsx   # Weekly insights
│   │   ├── AdvancedAnalytics.tsx   # Performance analytics
│   │   ├── GrowthChart.tsx         # Progress visualization
│   │   ├── StreakFlame.tsx         # Streak counter
│   │   ├── IconPicker.tsx          # Icon selection (100+ icons)
│   │   ├── GoalInput.tsx           # Voice/text input
│   │   ├── OrbitShell.tsx          # App shell with background
│   │   ├── OrbitDock.tsx           # Bottom navigation dock
│   │   ├── AppSidebar.tsx          # Sidebar navigation
│   │   └── ThemeToggle.tsx         # Dark/Light mode toggle
│   │
│   ├── lib/
│   │   ├── gemini.ts               # Gemini AI service
│   │   ├── translations.ts         # i18n translations
│   │   └── utils.ts                # Utility functions
│   │
│   ├── hooks/
│   │   └── use-mobile.ts           # Mobile detection hook
│   │
│   └── utils/
│       └── supabase/
│           ├── client.ts            # Supabase browser client
│           └── server.ts            # Supabase server client
│
├── supabase/
│   └── migrations/
│       └── create_analytics_cache.sql  # Analytics cache table
│
├── public/                         # Static assets
├── package.json                    # Dependencies
├── tsconfig.json                   # TypeScript config
├── next.config.ts                  # Next.js config
├── tailwind.config.ts              # Tailwind config
└── components.json                 # shadcn/ui config
```

---

## 🗄️ Database Schema

### Tables

#### `goals`
Main goals table with user progress tracking.
```sql
- id (UUID, PK)
- user_id (UUID, FK → auth.users)
- title (TEXT)
- domain (TEXT) - health|money|skills|career|study|home|other
- icon (TEXT) - Icon name from IconPicker
- current_points (INTEGER)
- target_points (INTEGER)
- status (TEXT) - active|completed|paused
- is_pinned (BOOLEAN)
- created_at (TIMESTAMP)
- estimated_completion_date (TIMESTAMP)
- total_days (INTEGER)
- ai_summary (TEXT)
```

#### `sub_layers`
Daily tasks/habits for each goal.
```sql
- id (UUID, PK)
- goal_id (UUID, FK → goals)
- task_description (TEXT)
- frequency (TEXT) - daily|weekly|monthly|x_times_per_week
- impact_weight (INTEGER) - 1-5
- time_required_minutes (INTEGER)
- completion_criteria (TEXT)
- completed_count (INTEGER)
```

#### `daily_logs`
User's daily progress entries.
```sql
- id (UUID, PK)
- goal_id (UUID, FK → goals)
- user_input (TEXT)
- ai_score (INTEGER) - Points awarded (5-25)
- ai_feedback (TEXT)
- breakdown (JSONB) - Task-by-task breakdown
- created_at (TIMESTAMP)
```

#### `weekly_summaries`
AI-generated weekly insights.
```sql
- id (UUID, PK)
- goal_id (UUID, FK → goals)
- week_start (DATE)
- week_end (DATE)
- summary_json (JSONB)
  ├── completed_count
  ├── total_points
  ├── best_day
  ├── best_activity
  ├── patterns[]
  ├── improvements[]
  ├── next_week_plan[]
  └── coach_message
```

#### `analytics_cache`
Cached analytics for performance optimization.
```sql
- id (UUID, PK)
- goal_id (UUID, FK → goals)
- current_week_points (INTEGER)
- last_week_points (INTEGER)
- week_comparison (DECIMAL)
- average_points_per_log (DECIMAL)
- total_active_days (INTEGER)
- most_productive_day (DATE)
- projected_completion_date (DATE)
- on_track (BOOLEAN)
- days_ahead_or_behind (INTEGER)
- computed_at (TIMESTAMP)
```

#### `goal_investigations`
Stores investigation data from AI analysis.
```sql
- id (UUID, PK)
- goal_id (UUID, FK → goals)
- investigation_data (JSONB)
```

---

## 🚀 Getting Started

### Prerequisites
- Node.js 20+ installed
- npm or yarn package manager
- Supabase account ([supabase.com](https://supabase.com))
- Google Gemini API key ([ai.google.dev](https://ai.google.dev/))
- Mistral API key ([mistral.ai](https://mistral.ai/))

### Installation

1. **Clone the repository**
```bash
git clone <repository-url>
cd my-app
```

2. **Install dependencies**
```bash
npm install
```

3. **Set up environment variables**

Create a `.env.local` file in the root directory:

```env
# Supabase
NEXT_PUBLIC_SUPABASE_URL=your_supabase_url
NEXT_PUBLIC_SUPABASE_ANON_KEY=your_supabase_anon_key
SUPABASE_SERVICE_ROLE_KEY=your_service_role_key

# AI APIs
GEMINI_API_KEY=your_gemini_api_key
MISTRAL_API_KEY=your_mistral_api_key
```

4. **Set up Supabase database**

Run the migration script to create the analytics cache table:
```bash
# Using Supabase CLI
supabase migration up

# Or manually in Supabase Dashboard:
# SQL Editor → Copy content from supabase/migrations/create_analytics_cache.sql → Run
```

Create the other tables manually in Supabase Dashboard or use the schema above.

5. **Run the development server**
```bash
npm run dev
```

6. **Open the app**

Navigate to [http://localhost:3000](http://localhost:3000)

---

## 📖 How It Works

### Goal Creation Flow

```mermaid
User Input → AI Investigation → Questions → AI Planning → Review → Save to DB
```

1. **Phase 1: Investigation** (`/api/goal/investigate`)
   - User describes their goal
   - AI (Gemini) analyzes and asks clarifying questions
   - Safety checks for harmful content
   - Realism assessment

2. **Phase 2: Planning** (`/api/goal/plan`)
   - AI creates a detailed plan with tasks
   - Estimates timeline and daily effort
   - Provides speedup options if requested
   - Simulates success probability

3. **Phase 3: Execution**
   - Goal and tasks saved to database
   - User starts tracking daily progress

### Daily Progress Flow

```mermaid
User Logs Progress → Fetch Previous Logs → AI Evaluation → Save to DB → Update Points
```

1. **User Input**: Text or voice description of daily activities
2. **Context Loading**: Fetches last 5 logs for comparison
3. **AI Evaluation** (`/api/goal/evaluate`):
   - Analyzes progress against tasks
   - Awards points (5-25 range)
   - Provides encouraging feedback
   - Maintains consistent scoring
4. **Database Update**: Saves log and updates goal points
5. **Streak Calculation**: Updates consecutive days streak

### Analytics System

```mermaid
Request Analytics → Check Cache → Compute if Needed → Save to Cache → Return Results
```

- **Smart Caching**: Results cached for 1 hour
- **Auto-Refresh**: Recalculates when cache expires
- **Performance**: Reduces API calls and computation

---

## 🎯 Core Features Explained

### 1. Goal Templates
**Location**: Home Page

Pre-built templates for common goals:
- 💪 Fitness: "Lose 10kg in 3 Months"
- 💻 Education: "Master Python Programming"
- 💼 Career: "Get Promoted at Work"
- 🌍 Language: "Learn English Fluently"
- 💰 Finance: "Save $5000 in 6 Months"
- 🎨 Hobbies: "Master Digital Art"

Each template includes:
- Pre-configured tasks with impact weights
- Realistic timeline estimation
- Frequency settings (daily/weekly)
- Target points (10,000)

### 2. Daily Progress Logging
**Location**: Dashboard → "Log Progress" button

**Features**:
- Text input with RTL support
- Voice input (Speech Recognition API)
- AI-powered evaluation
- Task-by-task breakdown
- Bonus points for extra effort
- Multilingual feedback

**Scoring System**:
- Small progress (10-30%): 3-7 points
- Moderate progress (40-60%): 8-12 points
- Good progress (70-90%): 13-18 points
- Excellent progress (100%+): 19-25 points
- Bonus: 0-5 points (exceptional work only)

### 3. Advanced Analytics
**Location**: Dashboard (collapsible card)

**Metrics**:
- Current week vs last week points
- Percentage improvement
- Average points per log entry
- Total active days
- Most productive day of week
- Projected completion date
- Days ahead/behind schedule

**Performance**:
- Results cached in `analytics_cache` table
- Auto-refresh every hour
- Manual refresh available

### 4. Weekly Summary
**Location**: Dashboard (collapsible card)

**AI-Generated Insights**:
- Activity count and total points
- Best performing day
- Best activity/task
- Observed patterns (2-3 insights)
- Improvement suggestions (2-3 actionable items)
- Next week plan (3-5 recommended tasks)
- Personalized coach message

**Powered by**: Mistral AI (mistral-small-latest)

### 5. Streak System
**Location**: Dashboard → Quick Stats

**How it works**:
- Counts consecutive days with logged progress
- Breaks if no log today or yesterday
- Visual flame animation based on streak length
- Color intensity increases with streak

**Streak Levels**:
- 0 days: Gray flame (inactive)
- 1-2 days: Orange flame (warming up)
- 3-6 days: Red flame (hot)
- 7-29 days: Red flame (very hot)
- 30+ days: Purple flame (legendary)

### 6. Growth Chart
**Location**: Dashboard

**Features**:
- Bar chart showing daily points
- Groups logs by date
- Hover tooltips with details
- Responsive design
- Empty state handling

---

## 🎨 UI Components

### Custom Components

#### Dashboard
Main goal tracking interface with:
- Goal title with icon (editable)
- Progress bar with percentage
- Date information (start, days left, target)
- Quick stats (points, tasks, streak)
- Growth chart
- Advanced analytics (collapsible)
- Weekly summary (collapsible)
- Daily focus task list
- Activity history
- Log progress button

#### GoalsList
View and manage all goals:
- Compact goal cards
- Progress bars
- Date information
- Pin/unpin functionality
- Edit/delete options
- Selection highlighting

#### GoalTemplates
Quick start with pre-built goals:
- Category filters (All, Fitness, Education, etc.)
- Template cards with descriptions
- One-click goal creation
- Auto-populated tasks

#### IconPicker
100+ icons organized in categories:
- General (Target, Zap, Star, etc.)
- Activities (Dumbbell, Book, Code, etc.)
- Transport (Car, Bike, Plane, etc.)
- Food (Pizza, Coffee, Apple, etc.)
- Nature (Mountain, Waves, Trees, etc.)
- Buildings (Home, Hospital, School, etc.)
- Finance (DollarSign, Wallet, PiggyBank, etc.)
- Time (Clock, Calendar, Timer, etc.)
- And many more...

### shadcn/ui Components Used
- Button
- Card
- Dialog
- Dropdown Menu
- Popover
- Tooltip
- Collapsible
- Badge
- Skeleton
- Separator

---

## 🔐 Security & Safety

### AI Safety Measures
1. **Pre-filtering**: Rule-based keyword detection
2. **AI Safety Gate**: Gemini analyzes content for harmful intent
3. **Refusal System**: Refuses and redirects harmful requests
4. **Safe Alternatives**: Suggests professional support when needed

### Database Security
- **Row Level Security (RLS)**: Enabled on all tables
- **User Isolation**: Users can only access their own data
- **Foreign Key Constraints**: Data integrity maintained
- **Cascade Deletes**: Proper cleanup when goals deleted

### Authentication
- Supabase Auth integration
- Session management
- Secure API routes

---

## 🌐 Internationalization (i18n)

### Supported Languages
- **English (en)**: Default language
- **Arabic (ar)**: Full RTL support

### Language Features
- Auto-detection from user input
- Persistent preference (localStorage)
- Dynamic RTL/LTR switching
- Translated UI elements
- AI responses in user's language

### Translation Coverage
- All UI labels and buttons
- Error messages
- AI feedback and coach messages
- Date formatting
- Number formatting

---

## 🎯 AI System Details

### Gemini AI Service (`lib/gemini.ts`)

#### Phase 1: Goal Investigator
**Model**: gemini-2.5-flash-lite

**Responsibilities**:
- Analyze goal text
- Ask 4-8 clarifying questions
- Assess realism and safety
- Determine readiness for planning

**Output**:
```json
{
  "status": "ok|needs_info|unrealistic|refused",
  "goal_understanding": {...},
  "questions": [...],
  "realism_check": {...}
}
```

#### Phase 2: Plan Architect
**Model**: gemini-2.5-flash-lite

**Responsibilities**:
- Create realistic action plan
- Generate 4-9 daily/weekly tasks
- Estimate timeline and effort
- Provide speedup options

**Output**:
```json
{
  "status": "ok|unrealistic|refused",
  "plan": {
    "goal_summary": "...",
    "estimated_total_days": 90,
    "recommended_daily_time_minutes": 60,
    "estimated_completion_date": "2026-05-01"
  },
  "tasks": [...],
  "speedup": {...}
}
```

#### Phase 3: Daily Judge
**Model**: gemini-2.5-flash-lite

**Responsibilities**:
- Evaluate daily progress
- Award points (5-25 range)
- Compare with previous logs
- Provide encouraging feedback
- Maintain scoring consistency

**Scoring Rules**:
- Strict and realistic
- Context-aware (considers history)
- Language-matched responses
- Bonus points for exceptional work

**Output**:
```json
{
  "status": "ok|refused",
  "detected_language": "ar|en",
  "total_points_awarded": 12,
  "task_breakdown": [...],
  "bonus": {...},
  "coach_message": "...",
  "comparison_with_previous": "..."
}
```

### Mistral AI Service
**Model**: mistral-small-latest

**Used for**: Weekly summaries

**Features**:
- Analyzes week's activity logs
- Identifies patterns and trends
- Suggests improvements
- Creates next week plan
- Generates motivational message

---

## 🎨 Design System

### Color Palette
- **Primary**: Main brand color (blue/purple)
- **Chart Colors**: 5 distinct colors for data visualization
- **Muted**: Subtle backgrounds and borders
- **Destructive**: Errors and warnings
- **Success**: Positive feedback (chart-2)

### Typography
- **Font**: IBM Plex Sans Arabic
- **Weights**: 100-700
- **Support**: Arabic + Latin characters

### Layout Principles
- **Glassmorphism**: backdrop-blur effects
- **Rounded Corners**: 2xl, 3xl for cards
- **Spacing**: Consistent 4px grid
- **Shadows**: Layered depth with ring effects
- **Animations**: Smooth transitions (300-500ms)

### Responsive Breakpoints
- **Mobile**: < 640px
- **Tablet**: 640px - 1024px
- **Desktop**: > 1024px

---

## 📱 Features by Page

### Home Page
- **Goal Creation Options**:
  - AI-Powered Creation (recommended)
  - Manual Creation (full control)
- **Goal Templates**: 6 pre-built templates with filters
- **Recent Goals**: Last 3 goals with quick access
- **Language Toggle**: Switch between Arabic/English

### Dashboard (Goal View)
- **Goal Card**: Title, icon, progress, dates
- **Quick Stats**: Total points, active tasks, streak
- **Growth Chart**: Visual progress over time
- **Advanced Analytics**: Performance metrics (collapsible)
- **Weekly Summary**: AI insights (collapsible)
- **Task List**: Daily focus tasks with actions
- **Activity History**: Recent logs with feedback
- **Log Progress**: Daily logging modal

### Goals List
- **All Goals**: Compact cards with progress
- **Quick Actions**: Pin, edit, delete
- **Selection**: Highlight active goal
- **Sorting**: Pinned first, then by date

### Settings
- **Appearance**: Dark/Light mode toggle
- **Language**: Arabic/English selector
- **Account Info**: Status and goal count
- **Notifications**: Coming soon

---

## 🔧 Configuration Files

### `next.config.ts`
- React Compiler enabled
- Turbopack for faster builds

### `tsconfig.json`
- Strict mode enabled
- Path aliases: `@/*` → `./src/*`
- ES2017 target

### `components.json`
- shadcn/ui configuration
- New York style
- CSS variables enabled
- Lucide icons

### `tailwind.config.ts`
- Custom color palette
- CSS variables for theming
- Dark mode support
- Custom animations

---

## 🚀 Deployment

### Vercel (Recommended)

1. **Push to GitHub**
```bash
git add .
git commit -m "Initial commit"
git push origin main
```

2. **Deploy on Vercel**
- Go to [vercel.com](https://vercel.com)
- Import your GitHub repository
- Add environment variables
- Deploy

3. **Environment Variables**
Add all variables from `.env.local` in Vercel dashboard

### Other Platforms
- **Netlify**: Supports Next.js
- **Railway**: Easy deployment
- **Self-hosted**: Use `npm run build` + `npm start`

---

## 📊 Performance Optimizations

### Caching Strategy
1. **Analytics Cache**: 1-hour TTL in database
2. **Weekly Summaries**: Cached per week
3. **Component Memoization**: React.memo where needed

### Code Splitting
- Automatic with Next.js App Router
- Dynamic imports for heavy components
- Route-based splitting

### Database Optimization
- Indexes on frequently queried columns
- Efficient queries with proper filtering
- RLS policies for security

---

## 🐛 Troubleshooting

### Common Issues

**Issue**: "Failed to evaluate log"
- **Solution**: Check GEMINI_API_KEY in environment variables

**Issue**: "Goal not found"
- **Solution**: Ensure RLS policies are set up correctly in Supabase

**Issue**: Voice input not working
- **Solution**: Use Chrome or Edge browser (Speech Recognition API)

**Issue**: Arabic text not displaying correctly
- **Solution**: Ensure IBM Plex Sans Arabic font is loaded

**Issue**: Analytics not loading
- **Solution**: Run the analytics_cache migration script

---

## 🔮 Future Enhancements

### Planned Features
- [ ] Push notifications for daily reminders
- [ ] Achievements and badges system
- [ ] Social features (friends, leaderboards)
- [ ] Export progress reports (PDF)
- [ ] Mobile app (React Native)
- [ ] Integration with calendar apps
- [ ] Habit tracking widgets
- [ ] Team goals and collaboration

---

## 📄 License

MIT License - feel free to use this project for personal or commercial purposes.

---

## 🤝 Contributing

Contributions are welcome! Please:
1. Fork the repository
2. Create a feature branch
3. Make your changes
4. Submit a pull request

---

## 📞 Support

For issues or questions:
- Open an issue on GitHub
- Check existing documentation
- Review Supabase and AI API docs

---

## 🙏 Acknowledgments

- **Next.js Team**: Amazing framework
- **Supabase**: Excellent backend platform
- **Google Gemini**: Powerful AI capabilities
- **Mistral AI**: Quality language models
- **shadcn**: Beautiful UI components
- **Lucide**: Comprehensive icon library

---

**Built with ❤️ using Next.js, TypeScript, and AI**
