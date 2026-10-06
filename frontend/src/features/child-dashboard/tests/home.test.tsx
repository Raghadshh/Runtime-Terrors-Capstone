import { Alert } from "react-native";
import React from "react";
import { render, screen, fireEvent } from "@testing-library/react-native";
import HomeScreen from "../home";
import { useMine } from "@/lib/dashboard";
import { useRouter } from "expo-router";

// Mock Expo Router
jest.mock("expo-router", () => ({
  useRouter: jest.fn(),
}));

// Mock the Zustand state store
jest.mock("@/lib/dashboard", () => ({
  useMine: jest.fn(),
  useRemind: jest.fn(() => ({ session: { theme: "cream" }, syncNote: null })),
}));

describe("HomeScreen Component", () => {
  const mockPush = jest.fn();

  beforeEach(() => {
    jest.clearAllMocks();
    jest.spyOn(Alert, "alert").mockImplementation(() => {});
    (useRouter as jest.Mock).mockReturnValue({ push: mockPush });
  });

  describe("Parent Dashboard Layout", () => {
    beforeEach(() => {
      const now = new Date();
      const todayISO = `${now.getFullYear()}-${`${now.getMonth() + 1}`.padStart(2, "0")}-${`${now.getDate()}`.padStart(2, "0")}`;

      (useMine as jest.Mock).mockReturnValue({
        user: { accountType: "parent", name: "Jamie Parent", preferredName: "Jamie", points: 20 },
        child: { name: "Leo", age: 7 },
        tasks: [
          { id: "1", title: "Clean Room", completed: false, date: todayISO, time: "09:00", durationMinutes: 15 },
          { id: "2", title: "Brush Teeth", completed: true, date: todayISO, time: "08:00", durationMinutes: 5 },
        ],
        routines: [{ steps: [{ completed: true }, { completed: false }] }],
        rewards: [{ points: 15 }, { points: 30 }],
      });
    });

    it("renders parent greeting and selected child info", async () => {
      await render(<HomeScreen />);

      expect(screen.getByText("Jamie")).toBeTruthy();
      expect(screen.getByText("SELECTED CHILD")).toBeTruthy();
      expect(screen.getByText("Leo")).toBeTruthy();
      expect(screen.getByText("7 years old")).toBeTruthy();
    });

    it("calculates today's progress correctly", async () => {
      await render(<HomeScreen />);

      expect(screen.getByText("1 of 2 tasks complete")).toBeTruthy();
      expect(screen.getByText("50%")).toBeTruthy();
    });

    it("opens the new task form when '+ Add Task' button is pressed", async () => {
      await render(<HomeScreen />);

      const addTaskButton = screen.getByText("+ Add Task");
      await fireEvent.press(addTaskButton);

      expect(mockPush).toHaveBeenCalledWith("/tasks/new");
      expect(Alert.alert).not.toHaveBeenCalled();
    });
  });

  describe("Independent User Dashboard Layout", () => {
    beforeEach(() => {
      const now = new Date();
      const todayISO = `${now.getFullYear()}-${`${now.getMonth() + 1}`.padStart(2, "0")}-${`${now.getDate()}`.padStart(2, "0")}`;

      (useMine as jest.Mock).mockReturnValue({
        user: { accountType: "independent", name: "Alex Independent", preferredName: "Alex" },
        tasks: [
          { id: "1", title: "Read Book", completed: false, date: todayISO, time: "10:00", durationMinutes: 20 },
        ],
        routines: [{ steps: [{ completed: true }] }],
      });
    });

    it("renders independent user view with motivational message", async () => {
      await render(<HomeScreen />);

      expect(screen.getByText("Alex")).toBeTruthy();
      expect(screen.getByText("You've got this!")).toBeTruthy();
      expect(screen.getByText("Up Next")).toBeTruthy();
      expect(screen.getByText("Read Book")).toBeTruthy();
    });

    it("opens the task list when 'View all' is pressed", async () => {
      await render(<HomeScreen />);

      const viewAllButton = screen.getByText("View all");
      await fireEvent.press(viewAllButton);

      expect(mockPush).toHaveBeenCalledWith("/tasks");
      expect(Alert.alert).not.toHaveBeenCalled();
    });
  });
});