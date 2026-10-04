"use server";

import { redirect } from "next/navigation";
import { revalidatePath } from "next/cache";
import { parseBirth, createReadingFlow, addFriendFlow, removeFriendFlow, payFlow, generateProse, TODAY_YEAR } from "@/lib/flow";

export interface ActionError { ok: false; error: string }

export async function createReading(_prev: unknown, form: FormData): Promise<ActionError | never> {
  let alias = "나", goalYear = 0, goalText = "", situation = "";
  try {
    alias = String(form.get("alias") ?? "").trim().slice(0, 12) || "나";
    goalYear = Number(form.get("goalYear"));
    goalText = String(form.get("goalText") ?? "").trim().slice(0, 100);
    situation = String(form.get("situation") ?? "").replace(/\s+/g, " ").trim().slice(0, 700);
    if (!goalYear || goalYear <= TODAY_YEAR || goalYear > TODAY_YEAR + 40) throw new Error(`이루고 싶은 해는 ${TODAY_YEAR + 1}년부터 ${TODAY_YEAR + 40}년 사이로 적어 주세요`);
    if (goalText.length < 2) throw new Error("꿈을 한 줄로 적어 주세요");
    if (situation.length < 10) throw new Error("지금의 나를 열 자 이상 적어 주세요. 상황, 지금 하고 있는 것, 꿈의 모습이면 됩니다");
    const birth = parseBirth(form);
    const id = await createReadingFlow(alias, birth, goalYear, goalText, situation);
    redirect(`/r/${id}`);
  } catch (e) {
    // redirect()는 예외로 동작하므로 그대로 던진다
    if (e && typeof e === "object" && "digest" in e) throw e;
    return { ok: false, error: e instanceof Error ? e.message : "입력을 확인해 주세요" };
  }
}

export async function addFriend(readingId: string, _prev: unknown, form: FormData): Promise<ActionError | never> {
  let fid: string;
  try {
    const alias = String(form.get("alias") ?? "").trim().slice(0, 12) || "친구";
    const birth = parseBirth(form);
    fid = await addFriendFlow(readingId, alias, birth);
  } catch (e) { return { ok: false, error: e instanceof Error ? e.message : "입력을 확인해 주세요" }; }
  revalidatePath(`/r/${readingId}`);
  redirect(`/r/${readingId}/join?me=${fid}`);
}

export async function removeFriend(readingId: string, friendId: string) {
  await removeFriendFlow(readingId, friendId);
  revalidatePath(`/r/${readingId}`);
}

export async function payAction(id: string) {
  await payFlow(id);
  revalidatePath(`/r/${id}`);
  revalidatePath(`/r/${id}/hard`);
  redirect(`/r/${id}/hard`);
}

export async function retryProse(id: string) {
  await generateProse(id, false);
  revalidatePath(`/r/${id}`);
}
