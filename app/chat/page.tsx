import ChatView from "@/components/ChatView";
import PwaGate from "@/components/PwaGate";

export const dynamic = "force-dynamic";

export default function ChatPage() {
  return (
    <PwaGate>
      <ChatView />
    </PwaGate>
  );
}
