import { describe, test, expect, beforeEach, afterEach, jest } from "bun:test";
import { User as PrismaUser, PrismaClient } from "@prisma/client";
import { User } from "shared/models/user";
import { ModelRegistry } from "system/model/model-registry";

// Setup global prisma client for testing
const g = (typeof global !== "undefined" ? global : undefined) as unknown as {
  prisma: PrismaClient;
};
g.prisma = new PrismaClient();

describe("User Model", () => {
  let userModel: User;

  beforeEach(async () => {
    userModel = ModelRegistry.getInstance("User", User);

    // Wait for prisma initialization
    while (!(userModel as any).prisma) {
      await new Promise((resolve) => setTimeout(resolve, 50));
    }

    // Clean up existing test data
    await (userModel as any).prisma.user.deleteMany({
      where: {
        email: "test@example.com",
      },
    });
  });

  afterEach(async () => {
    // Clean up test data after each test
    await (userModel as any).prisma.user.deleteMany({
      where: {
        email: "test@example.com",
      },
    });
  });

  describe("validation", () => {
    test("valid user passes validation", () => {
      const mockUser: Partial<PrismaUser> = {
        email: "test@example.com",
        name: "Test User",
        role: "user",
      };
      const result = (userModel as any).validate(mockUser);
      expect(result).toBe(true);
    });

    test("invalid email fails validation", () => {
      const mockUser: Partial<PrismaUser> = {
        email: "invalid-email",
        name: "Test User",
        role: "user",
      };
      const result = (userModel as any).validate(mockUser);
      expect(typeof result).toBe("string");
      expect(result).toBe("Invalid email format");
    });

    test("missing required fields fails validation", () => {
      const mockUser: Partial<PrismaUser> = {
        email: "test@example.com",
      };
      const result = (userModel as any).validate(mockUser);
      expect(typeof result).toBe("string");
      expect(result).toContain("required");
    });

    test("invalid role fails validation", () => {
      const mockUser: Partial<PrismaUser> = {
        email: "test@example.com",
        name: "Test User",
        role: "invalid" as any,
      };
      const result = (userModel as any).validate(mockUser);
      expect(typeof result).toBe("string");
      expect(result).toContain("Must be one of: admin,user,guest");
    });
  });

  describe("role formatting", () => {
    test("formats admin role correctly", () => {
      const formatted = (userModel as any).config.columns.role.format!("admin");
      expect(formatted).toBe("🔑 Admin");
    });

    test("formats user role correctly", () => {
      const formatted = (userModel as any).config.columns.role.format!("user");
      expect(formatted).toBe("👤 User");
    });

    test("formats guest role correctly", () => {
      const formatted = (userModel as any).config.columns.role.format!("guest");
      expect(formatted).toBe("👻 Guest");
    });

    test("returns original value for unknown role", () => {
      const formatted = (userModel as any).config.columns.role.format!(
        "unknown"
      );
      expect(formatted).toBe("unknown");
    });
  });

  describe("title", () => {
    test("returns name as title", () => {
      (userModel as any).data = {
        name: "John Doe",
        email: "john@example.com",
        role: "user",
      } as PrismaUser;
      expect(userModel.title()).toBe("John Doe");
    });

    test("returns empty string if no name", () => {
      (userModel as any).data = null;
      expect(userModel.title()).toBe("");
    });
  });

  describe("permissions", () => {
    test("admin can see all users", () => {
      (userModel as any).currentUser = { role: "admin" } as PrismaUser;
      expect(userModel.getDefaultConditions()).toEqual({});
    });

    test("non-admin gets empty conditions currently", () => {
      (userModel as any).currentUser = { role: "user" } as PrismaUser;
      expect(userModel.getDefaultConditions()).toEqual({});
    });

    test("no current user gets empty conditions", () => {
      (userModel as any).currentUser = undefined;
      expect(userModel.getDefaultConditions()).toEqual({});
    });
  });

  describe("CRUD operations", () => {
    describe("create", () => {
      test("creates a new user", async () => {
        const newUser = {
          email: "test.create@example.com",
          name: "Test Create User",
          role: "user",
        };
        const createdUser = await userModel.create(newUser);
        expect(createdUser.id).toBeDefined();
        expect(createdUser.email).toBe(newUser.email);
        expect(createdUser.name).toBe(newUser.name);
        expect(createdUser.role).toBe(newUser.role);
      });
    });

    describe("read", () => {
      let testUser: any;

      beforeEach(async () => {
        testUser = await userModel.create({
          email: "test.read@example.com",
          name: "Test Read User",
          role: "user",
        });
      });

      test("reads an existing user by id", async () => {
        const user = await userModel.findFirst(testUser.id);
        expect(user).toBeDefined();
        expect(user.id).toBe(testUser.id);
        expect(user.email).toBe(testUser.email);
      });

      test("reads users with conditions", async () => {
        const users = await userModel.findMany({
          where: {
            email: { contains: "test.read" },
          },
        });
        expect(users.data.length).toBeGreaterThan(0);
        expect(users.data[0].email).toBe(testUser.email);
      });
    });

    describe("update", () => {
      let testUser: any;

      beforeEach(async () => {
        testUser = await userModel.create({
          email: "test.update@example.com",
          name: "Test Update User",
          role: "user",
        });
      });

      test("updates an existing user", async () => {
        const updateData = {
          email: "test.updated@example.com",
          name: "Updated Test User",
          role: "admin",
        };
        const updatedUser = await userModel.update(testUser.id, updateData);
        expect(updatedUser.id).toBe(testUser.id);
        expect(updatedUser.email).toBe(updateData.email);
        expect(updatedUser.name).toBe(updateData.name);
        expect(updatedUser.role).toBe(updateData.role);
      });
    });

    describe("delete", () => {
      let testUser: any;

      beforeEach(async () => {
        testUser = await userModel.create({
          email: "test.delete@example.com",
          name: "Test Delete User",
          role: "user",
        });
      });

      test("soft deletes an existing user", async () => {
        const deletedUser = await userModel.delete(testUser.id);
        expect(deletedUser.id).toBe(testUser.id);
        expect(deletedUser.deleted_at).toBeDefined();

        // Verify the user is not found in normal queries
        const notFound = await userModel.findFirst(testUser.id);
        expect(notFound).toBeNull();
      });
    });
  });

  describe("caching", () => {
    let testUser: any;

    beforeEach(async () => {
      // Reset cache and set client mode
      (userModel as any).config.cache = { ttl: 60 };
      (userModel as any)._mode = "client";
      (userModel as any).clearCache();

      // Create test user
      testUser = await userModel.create({
        email: "test.cache@example.com",
        name: "Test Cache User",
        role: "user",
      });
    });

    test("caches findFirst results", async () => {
      // First call should hit database
      const user = await userModel.findFirst(testUser.id);
      expect(user.id).toBe(testUser.id);

      // Modify the user directly in database
      await (userModel as any).prisma.user.update({
        where: { id: testUser.id },
        data: { name: "Modified Name" },
      });

      // Second call should return cached result
      const cachedUser = await userModel.findFirst(testUser.id);
      expect(cachedUser.name).toBe("Test Cache User");

      // Call with useCache: false should see the update
      const freshUser = await userModel.findFirst({
        where: { id: testUser.id },
        useCache: false,
      });
      expect(freshUser.name).toBe("Modified Name");
    });

    test("caches findMany results", async () => {
      // First call should hit database
      const users = await userModel.findMany({
        where: { email: { contains: "test.cache" } },
      });
      expect(users.data.length).toBe(1);

      // Clear cache before direct database update
      (userModel as any).invalidateCache();

      // Modify user directly in database
      await (userModel as any).prisma.user.update({
        where: { id: testUser.id },
        data: { name: "Modified List Name" },
      });

      // Second call should get fresh data since cache was invalidated
      const freshUsers = await userModel.findMany({
        where: { email: { contains: "test.cache" } },
      });
      expect(freshUsers.data[0].name).toBe("Modified List Name");
    });

    test("invalidates cache on update", async () => {
      // Cache initial data
      await userModel.findFirst(testUser.id);

      // Update should invalidate cache
      const updatedName = "Updated Cache Name";
      await userModel.update(testUser.id, {
        name: updatedName,
        email: testUser.email, // Include required fields
        role: testUser.role, // Include required fields
      });

      // Should get fresh data
      const updatedUser = await userModel.findFirst(testUser.id);
      expect(updatedUser.name).toBe(updatedName);
    });

    test("invalidates cache on delete", async () => {
      // Cache initial data
      await userModel.findFirst(testUser.id);

      // Delete should invalidate cache
      await userModel.delete(testUser.id);

      // Should get null (not from cache)
      const deletedUser = await userModel.findFirst(testUser.id);
      expect(deletedUser).toBeNull();
    });
  });
});
