import { NextResponse } from 'next/server';
import { createClient } from '@/utils/supabase/client';

export async function POST(req: Request) {
    try {
        const { goalId, forceRefresh = false } = await req.json();

        if (!goalId) {
            return NextResponse.json({ error: 'goalId is required' }, { status: 400 });
        }

        const supabase = createClient();

        // Check if we have cached analytics (less than 1 hour old)
        if (!forceRefresh) {
            const { data: cached, error: cacheError } = await supabase
                .from('analytics_cache')
                .select('*')
                .eq('goal_id', goalId)
                .single();

            if (!cacheError && cached) {
                const cacheAge = Date.now() - new Date(cached.computed_at).getTime();
                const oneHour = 60 * 60 * 1000;

                // Return cached data if less than 1 hour old
                if (cacheAge < oneHour) {
                    return NextResponse.json({
                        data: {
                            currentWeekPoints: cached.current_week_points,
                            lastWeekPoints: cached.last_week_points,
                            weekComparison: cached.week_comparison,
                            averagePointsPerLog: cached.average_points_per_log,
                            totalActiveDays: cached.total_active_days,
                            mostProductiveDay: cached.most_productive_day,
                            bestTimeOfDay: null,
                            projectedCompletionDate: cached.projected_completion_date,
                            onTrack: cached.on_track,
                            daysAheadOrBehind: cached.days_ahead_or_behind,
                        },
                        cached: true
                    });
                }
            }
        }

        // Fetch goal details
        const { data: goal, error: goalError } = await supabase
            .from('goals')
            .select('target_points, current_points, created_at, estimated_completion_date')
            .eq('id', goalId)
            .single();

        if (goalError || !goal) {
            return NextResponse.json({ error: 'Goal not found' }, { status: 404 });
        }

        // Fetch all logs
        const { data: allLogs, error: logsError } = await supabase
            .from('daily_logs')
            .select('created_at, ai_score')
            .eq('goal_id', goalId)
            .order('created_at', { ascending: true });

        if (logsError) {
            return NextResponse.json({ error: 'Failed to fetch logs' }, { status: 500 });
        }

        if (!allLogs || allLogs.length === 0) {
            return NextResponse.json({
                data: {
                    currentWeekPoints: 0,
                    lastWeekPoints: 0,
                    weekComparison: 0,
                    averagePointsPerLog: 0,
                    totalActiveDays: 0,
                    mostProductiveDay: null,
                    bestTimeOfDay: null,
                    projectedCompletionDate: null,
                    onTrack: true,
                    daysAheadOrBehind: 0,
                }
            });
        }

        // Calculate analytics
        const now = new Date();
        const currentWeekStart = new Date(now);
        currentWeekStart.setDate(now.getDate() - now.getDay()); // Start of current week (Sunday)
        currentWeekStart.setHours(0, 0, 0, 0);

        const lastWeekStart = new Date(currentWeekStart);
        lastWeekStart.setDate(currentWeekStart.getDate() - 7);

        const lastWeekEnd = new Date(currentWeekStart);
        lastWeekEnd.setSeconds(-1);

        // Current week points
        const currentWeekPoints = allLogs
            .filter(log => new Date(log.created_at) >= currentWeekStart)
            .reduce((sum, log) => sum + log.ai_score, 0);

        // Last week points
        const lastWeekPoints = allLogs
            .filter(log => {
                const logDate = new Date(log.created_at);
                return logDate >= lastWeekStart && logDate <= lastWeekEnd;
            })
            .reduce((sum, log) => sum + log.ai_score, 0);

        // Week comparison percentage
        const weekComparison = lastWeekPoints > 0 
            ? ((currentWeekPoints - lastWeekPoints) / lastWeekPoints) * 100 
            : currentWeekPoints > 0 ? 100 : 0;

        // Average points per log
        const totalPoints = allLogs.reduce((sum, log) => sum + log.ai_score, 0);
        const averagePointsPerLog = totalPoints / allLogs.length;

        // Total active days (unique dates)
        const uniqueDates = new Set(
            allLogs.map(log => new Date(log.created_at).toISOString().split('T')[0])
        );
        const totalActiveDays = uniqueDates.size;

        // Most productive day (day with highest total points)
        const dayPoints: Record<string, number> = {};
        allLogs.forEach(log => {
            const date = new Date(log.created_at).toISOString().split('T')[0];
            dayPoints[date] = (dayPoints[date] || 0) + log.ai_score;
        });
        const mostProductiveDay = Object.entries(dayPoints).sort((a, b) => b[1] - a[1])[0]?.[0] || null;

        // Projected completion date
        const goalStartDate = new Date(goal.created_at);
        const daysSinceStart = Math.ceil((now.getTime() - goalStartDate.getTime()) / (1000 * 60 * 60 * 24));
        const averagePointsPerDay = daysSinceStart > 0 ? goal.current_points / daysSinceStart : 0;
        
        let projectedCompletionDate = null;
        let onTrack = true;
        let daysAheadOrBehind = 0;

        if (averagePointsPerDay > 0) {
            const remainingPoints = goal.target_points - goal.current_points;
            const daysNeeded = Math.ceil(remainingPoints / averagePointsPerDay);
            projectedCompletionDate = new Date(now.getTime() + daysNeeded * 24 * 60 * 60 * 1000).toISOString();

            // Compare with estimated completion date
            if (goal.estimated_completion_date) {
                const estimatedDate = new Date(goal.estimated_completion_date);
                const projectedDate = new Date(projectedCompletionDate);
                const diffDays = Math.ceil((estimatedDate.getTime() - projectedDate.getTime()) / (1000 * 60 * 60 * 24));
                
                onTrack = diffDays >= 0;
                daysAheadOrBehind = diffDays;
            }
        }

        // Save to cache
        const cacheData = {
            goal_id: goalId,
            current_week_points: currentWeekPoints,
            last_week_points: lastWeekPoints,
            week_comparison: weekComparison,
            average_points_per_log: averagePointsPerLog,
            total_active_days: totalActiveDays,
            most_productive_day: mostProductiveDay,
            projected_completion_date: projectedCompletionDate,
            on_track: onTrack,
            days_ahead_or_behind: daysAheadOrBehind,
            computed_at: new Date().toISOString(),
        };

        await supabase
            .from('analytics_cache')
            .upsert(cacheData, { onConflict: 'goal_id' });

        return NextResponse.json({
            data: {
                currentWeekPoints,
                lastWeekPoints,
                weekComparison,
                averagePointsPerLog,
                totalActiveDays,
                mostProductiveDay,
                bestTimeOfDay: null,
                projectedCompletionDate,
                onTrack,
                daysAheadOrBehind,
            },
            cached: false
        });

    } catch (error: any) {
        console.error('Analytics API Error:', error);
        return NextResponse.json(
            { error: 'Internal server error', message: error?.message },
            { status: 500 }
        );
    }
}
