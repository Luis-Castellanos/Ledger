type SnapshotLike = {
  accountId: string;
  asOfDate: string;
  balanceMinor: number;
};

export type NetWorthPoint = {
  date: string;
  netWorthMinor: number;
  assetsMinor: number;
  liabilitiesMinor: number;
};

/*
 * Build a daily-resolution net worth series from point-in-time balance
 * snapshots. Each account's last known balance carries forward, so the series
 * only moves when a snapshot lands — matching the "statements are source
 * material" model rather than guessing between data points.
 */
export function buildNetWorthSeries(snapshots: SnapshotLike[]): NetWorthPoint[] {
  if (snapshots.length === 0) {
    return [];
  }

  const sorted = [...snapshots].sort((left, right) => {
    if (left.asOfDate === right.asOfDate) {
      return left.accountId.localeCompare(right.accountId);
    }
    return left.asOfDate < right.asOfDate ? -1 : 1;
  });

  const lastKnown = new Map<string, number>();
  const points: NetWorthPoint[] = [];
  let currentDate: string | null = null;

  const flush = (date: string) => {
    let assets = 0;
    let liabilities = 0;
    for (const balance of lastKnown.values()) {
      if (balance >= 0) {
        assets += balance;
      } else {
        liabilities += balance;
      }
    }
    points.push({
      date,
      netWorthMinor: assets + liabilities,
      assetsMinor: assets,
      liabilitiesMinor: liabilities,
    });
  };

  for (const snapshot of sorted) {
    if (currentDate !== null && snapshot.asOfDate !== currentDate) {
      flush(currentDate);
    }
    lastKnown.set(snapshot.accountId, snapshot.balanceMinor);
    currentDate = snapshot.asOfDate;
  }

  if (currentDate !== null) {
    flush(currentDate);
  }

  return points;
}

export function filterSeriesByRange(series: NetWorthPoint[], fromDate: string | null): NetWorthPoint[] {
  if (!fromDate || series.length === 0) {
    return series;
  }

  const inRange = series.filter((point) => point.date >= fromDate);
  // keep one anchor point from before the window so the chart doesn't start mid-air
  const anchorIndex = series.findIndex((point) => point.date >= fromDate);
  if (anchorIndex > 0) {
    return [{ ...series[anchorIndex - 1], date: fromDate }, ...inRange];
  }
  return inRange;
}
