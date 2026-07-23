import { useMemo, useState } from 'react';
import { JobCard, StaffJobCard } from '@/components/job-card';
import { Empty, ErrorView, Loading, Screen, SearchBar } from '@/components/kit';
import { api } from '@/lib/api';
import { useIsStaff } from '@/lib/roles';
import { useQuery } from '@/lib/use-query';
import type { BoardCard, BoardView, WorkItem } from '@/lib/types';

/**
 * Jobs is two different reads.
 *
 * The owner gets /board — the read-model with customer + vehicle joined on. That endpoint is OWNER-only
 * (it exposes the whole shop), so an employee reading it gets 403 "Insufficient role". Employees read
 * /work-items instead, which the API scopes server-side to jobs assigned to them.
 */
export default function JobsScreen() {
  const isStaff = useIsStaff();
  return isStaff ? <StaffJobs /> : <OwnerJobs />;
}

function StaffJobs() {
  const [q, setQ] = useState('');
  const { data, error, loading, reload } = useQuery<WorkItem[]>(
    () => api.get<WorkItem[]>('/work-items?type=job'),
    [],
  );

  const jobs = useMemo(() => data ?? [], [data]);
  const filtered = useMemo(() => {
    const term = q.trim().toLowerCase();
    if (!term) return jobs;
    return jobs.filter((j) =>
      [j.reference, j.stateName].some((f) => String(f).toLowerCase().includes(term)),
    );
  }, [jobs, q]);

  if (loading && !data) return <Loading />;
  if (error && !data) return <ErrorView message={error} onRetry={reload} />;

  return (
    <Screen refreshing={loading} onRefresh={reload}>
      <SearchBar
        placeholder="Search my jobs…"
        value={q}
        onChangeText={setQ}
        autoCorrect={false}
        autoCapitalize="none"
      />
      {jobs.length === 0 ? (
        <Empty message="Nothing assigned to you yet." icon="construct-outline" />
      ) : filtered.length === 0 ? (
        <Empty message={`Nothing matches “${q.trim()}”.`} icon="search-outline" />
      ) : (
        filtered.map((j) => <StaffJobCard key={j.id} item={j} />)
      )}
    </Screen>
  );
}

function OwnerJobs() {
  const [q, setQ] = useState('');
  const { data, error, loading, reload } = useQuery<BoardView>(
    () => api.get<BoardView>('/board?type=job'),
    [],
  );

  const cards = useMemo<BoardCard[]>(
    () => (data ? data.columns.flatMap((c) => c.cards) : []),
    [data],
  );

  // Filter across the fields a person would actually search by: reference, customer, vehicle, state.
  const filtered = useMemo<BoardCard[]>(() => {
    const term = q.trim().toLowerCase();
    if (!term) return cards;
    return cards.filter((c) =>
      [c.reference, c.customerName, c.vehicleLabel, c.stateName]
        .filter(Boolean)
        .some((f) => String(f).toLowerCase().includes(term)),
    );
  }, [cards, q]);

  if (loading && !data) return <Loading />;
  if (error && !data) return <ErrorView message={error} onRetry={reload} />;

  return (
    <Screen refreshing={loading} onRefresh={reload}>
      <SearchBar
        placeholder="Search jobs, people, rego…"
        value={q}
        onChangeText={setQ}
        autoCorrect={false}
        autoCapitalize="none"
      />
      {cards.length === 0 ? (
        <Empty message="No jobs yet." icon="construct-outline" />
      ) : filtered.length === 0 ? (
        <Empty message={`Nothing matches “${q.trim()}”.`} icon="search-outline" />
      ) : (
        filtered.map((card) => <JobCard key={card.id} card={card} />)
      )}
    </Screen>
  );
}
