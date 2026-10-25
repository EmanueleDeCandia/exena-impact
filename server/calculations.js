export function calculateFundCents(order) {
  return Math.round(order.totalCents * order.devolutionRate / 100);
}

export function reconcileAttestation(attestation, order) {
  const expectedFundCents = calculateFundCents(order);
  return {
    valid:
      attestation.orderId === order.id &&
      attestation.pairs === order.pairs &&
      attestation.totalCents === order.totalCents &&
      attestation.fundCents === expectedFundCents,
    expectedFundCents,
    actualFundCents: attestation.fundCents,
  };
}

export function aggregateOrders(orders, { siteId, organizationId } = {}) {
  const unique = new Map();
  for (const order of orders) {
    if (order.status !== 'CONFIRMED') continue;
    if (siteId && order.siteId !== siteId) continue;
    if (organizationId && order.organizationId !== organizationId) continue;
    unique.set(order.id, order);
  }

  return [...unique.values()].reduce((summary, order) => {
    summary.orderIds.push(order.id);
    summary.organizationIds.add(order.organizationId);
    summary.pairs += order.pairs;
    summary.totalCents += order.totalCents;
    summary.fundCents += calculateFundCents(order);
    return summary;
  }, {
    orderIds: [],
    organizationIds: new Set(),
    pairs: 0,
    totalCents: 0,
    fundCents: 0,
  });
}

export function finalizeOrderSummary(summary) {
  return {
    ...summary,
    organizationIds: [...summary.organizationIds],
    interventions: Math.floor(summary.fundCents / 250000),
  };
}

export function computePackCompleteness(pack, evidenceDocuments) {
  const byId = new Map(evidenceDocuments.map((document) => [document.id, document]));
  const items = pack.items.map((item) => {
    const evidence = item.evidenceId ? byId.get(item.evidenceId) : null;
    const complete = Boolean(evidence && evidence.status === 'VERIFIED');
    return { ...item, owner: item.owner ?? 'ESG Manager demo', evidence: evidence ?? null, complete };
  });
  const completeItems = items.filter((item) => item.complete).length;
  return {
    items,
    completeItems,
    totalItems: items.length,
    percentage: items.length ? Math.round(completeItems / items.length * 100) : 0,
    complete: items.length > 0 && completeItems === items.length,
  };
}

export function isShareActive(share, now = new Date()) {
  return !share.revokedAt && new Date(share.expiresAt).getTime() > now.getTime();
}
