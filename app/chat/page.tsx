import ChatView from "@/components/ChatView";
import PushGate from "@/components/PushGate";
import PwaGate from "@/components/PwaGate";

export const dynamic = "force-dynamic";

export default function ChatPage() {
  return (
    <PwaGate>
      <PushGate>
        <ChatView />
      </PushGate>
    </PwaGate>
  );
}
