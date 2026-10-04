import React from "react";
import { render, screen, fireEvent } from "@testing-library/react-native";
import ChildDashboardScreen from "../child";
import { useMine } from "@/lib/store";
import { useRouter } from "expo-router";

jest.mock("expo-router", () => ({
  useRouter: jest.fn(),
}));

jest.mock("@/lib/store", () => ({
  useMine: jest.fn(),
  useRemind: jest.fn(() => ({ session: { theme: "cream" }, syncNote: null })),
}));

describe("ChildDashboardScreen Component", () => {
  const mockPush = jest.fn();

  beforeEach(() => {
    jest.clearAllMocks();
    (useRouter as jest.Mock).mockReturnValue({ push: mockPush });

    (useMine as jest.Mock).mockReturnValue({
      child: { name: "Sam" },
      user: { preferredName: "Sam", points: 40 },
      tasks: [
        { id: "t1", title: "Pack Backpack", completed: false, time: "08:00", durationMinutes: 10 },
        { id: "t2", title: "Make Bed", completed: true, time: "07:30", durationMinutes: 5 },
      ],
      routines: [
        {
          id: "r1",
          name: "Morning Routine",
          steps: [{ completed: true }, { completed: false }],
        },
      ],
      rewards: [{ id: "rw1", points: 50 }, { id: "rw2", points: 100 }],
    });
  });

  it("renders personal greeting and task summary", async () => {
    await render(<ChildDashboardScreen />);

    expect(screen.getByText("Good morning, Sam!")).toBeTruthy();
    expect(screen.getByText("You have 1 small wins waiting.")).toBeTruthy();
    expect(screen.getByText("1 of 2")).toBeTruthy();
  });

  it("displays points and points needed for next reward", async () => {
    await render(<ChildDashboardScreen />);

    expect(screen.getByText("★ 40")).toBeTruthy();
    expect(screen.getByText("10 points away")).toBeTruthy();
  });

  it("navigates to task details when an open task card is tapped", async () => {
    await render(<ChildDashboardScreen />);

    const taskCard = screen.getByText("Pack Backpack");
    await fireEvent.press(taskCard);

    expect(mockPush).toHaveBeenCalledWith("/tasks/t1");
  });

  it("navigates to routine details when routine card is pressed", async () => {
    await render(<ChildDashboardScreen />);

    const routineCard = screen.getByText("Morning Routine");
    await fireEvent.press(routineCard);

    expect(mockPush).toHaveBeenCalledWith("/routines/r1");
  });
});
