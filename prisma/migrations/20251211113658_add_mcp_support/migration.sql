-- RedefineTables
PRAGMA defer_foreign_keys=ON;
PRAGMA foreign_keys=OFF;
CREATE TABLE "new_UserSettings" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "userId" TEXT NOT NULL,
    "aiProvider" TEXT NOT NULL DEFAULT 'claude',
    "claudeApiKey" TEXT,
    "openaiApiKey" TEXT,
    "geminiApiKey" TEXT,
    "useMCP" BOOLEAN NOT NULL DEFAULT false,
    "mcpServerCommand" TEXT,
    "mcpServerArgs" TEXT,
    "mcpServerEnv" TEXT,
    "customPrompt" TEXT,
    "reviewLanguage" TEXT NOT NULL DEFAULT 'ko',
    "reviewStyle" TEXT NOT NULL DEFAULT 'detailed',
    CONSTRAINT "UserSettings_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User" ("id") ON DELETE CASCADE ON UPDATE CASCADE
);
INSERT INTO "new_UserSettings" ("aiProvider", "claudeApiKey", "customPrompt", "geminiApiKey", "id", "openaiApiKey", "reviewLanguage", "reviewStyle", "userId") SELECT "aiProvider", "claudeApiKey", "customPrompt", "geminiApiKey", "id", "openaiApiKey", "reviewLanguage", "reviewStyle", "userId" FROM "UserSettings";
DROP TABLE "UserSettings";
ALTER TABLE "new_UserSettings" RENAME TO "UserSettings";
CREATE UNIQUE INDEX "UserSettings_userId_key" ON "UserSettings"("userId");
PRAGMA foreign_keys=ON;
PRAGMA defer_foreign_keys=OFF;
