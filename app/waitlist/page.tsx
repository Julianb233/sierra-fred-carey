import { redirect } from "next/navigation";

export default function WaitlistPage() {
  redirect("/start-now?source=waitlist");
}
