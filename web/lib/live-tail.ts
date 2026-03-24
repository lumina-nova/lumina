export function topicTailSocketURL(topicName: string, partition: number) {
  const protocol = window.location.protocol === "https:" ? "wss" : "ws";
  return `${protocol}://${window.location.hostname}:9099/api/topics/${encodeURIComponent(topicName)}/tail?partition=${partition}`;
}
