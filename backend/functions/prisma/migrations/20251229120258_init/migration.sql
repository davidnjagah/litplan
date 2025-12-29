-- CreateEnum
CREATE TYPE "SubscriptionStatus" AS ENUM ('FREE', 'PRO', 'TRIAL', 'EXPIRED', 'CANCELLED');

-- CreateEnum
CREATE TYPE "SubscriptionTier" AS ENUM ('FREE', 'PRO');

-- CreateEnum
CREATE TYPE "PlanType" AS ENUM ('BAR', 'CLUB', 'EVENT', 'RESTAURANT');

-- CreateEnum
CREATE TYPE "ActivityType" AS ENUM ('VIEWED_CITY', 'VIEWED_PLAN', 'VIEWED_FLOW', 'SAVED_CITY', 'UNSAVED_CITY', 'SEARCH');

-- CreateTable
CREATE TABLE "User" (
    "id" TEXT NOT NULL,
    "clerkUserId" TEXT NOT NULL,
    "email" TEXT,
    "displayName" TEXT,
    "imageUrl" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "User_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "Subscription" (
    "id" TEXT NOT NULL,
    "userId" TEXT NOT NULL,
    "clerkUserId" TEXT NOT NULL,
    "status" "SubscriptionStatus" NOT NULL DEFAULT 'FREE',
    "tier" "SubscriptionTier" NOT NULL DEFAULT 'FREE',
    "startDate" TIMESTAMP(3),
    "expiryDate" TIMESTAMP(3),
    "autoRenew" BOOLEAN NOT NULL DEFAULT false,
    "transactionId" TEXT,
    "productId" TEXT,
    "originalTransactionId" TEXT,
    "maxCitiesPerWeek" INTEGER NOT NULL DEFAULT 1,
    "maxPlansPerCity" INTEGER NOT NULL DEFAULT 10,
    "weekendAccess" BOOLEAN NOT NULL DEFAULT false,
    "groupPlansAccess" BOOLEAN NOT NULL DEFAULT false,
    "savedCitiesAccess" BOOLEAN NOT NULL DEFAULT false,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "Subscription_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "City" (
    "id" TEXT NOT NULL,
    "cityId" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "country" TEXT NOT NULL,
    "countryCode" TEXT NOT NULL,
    "rank" INTEGER NOT NULL,
    "timezone" TEXT NOT NULL,
    "heroImage" TEXT,
    "cardImage" TEXT,
    "accentColor" TEXT DEFAULT '#00D9FF',
    "totalPlansThisWeek" INTEGER NOT NULL DEFAULT 0,
    "featured" BOOLEAN NOT NULL DEFAULT false,
    "latitude" DOUBLE PRECISION NOT NULL,
    "longitude" DOUBLE PRECISION NOT NULL,
    "lastUpdated" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "City_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "Plan" (
    "id" TEXT NOT NULL,
    "planId" TEXT NOT NULL,
    "cityId" TEXT NOT NULL,
    "rank" INTEGER NOT NULL,
    "title" TEXT NOT NULL,
    "venueName" TEXT NOT NULL,
    "description" TEXT,
    "category" TEXT NOT NULL,
    "type" "PlanType" NOT NULL,
    "heroImage" TEXT,
    "thumbnailImage" TEXT,
    "galleryImages" TEXT[] DEFAULT ARRAY[]::TEXT[],
    "address" TEXT,
    "neighborhood" TEXT,
    "googleMapsUrl" TEXT,
    "latitude" DOUBLE PRECISION,
    "longitude" DOUBLE PRECISION,
    "date" TEXT,
    "startTime" TEXT,
    "endTime" TEXT,
    "isWeekend" BOOLEAN NOT NULL DEFAULT false,
    "weekday" TEXT,
    "entryFee" INTEGER,
    "currency" TEXT NOT NULL DEFAULT 'USD',
    "priceRange" TEXT,
    "freeEntry" BOOLEAN NOT NULL DEFAULT true,
    "genres" TEXT[] DEFAULT ARRAY[]::TEXT[],
    "vibes" TEXT[] DEFAULT ARRAY[]::TEXT[],
    "eventType" TEXT,
    "isIndividual" BOOLEAN NOT NULL DEFAULT true,
    "isGroup" BOOLEAN NOT NULL DEFAULT false,
    "isFeatured" BOOLEAN NOT NULL DEFAULT false,
    "averageRating" DOUBLE PRECISION,
    "totalReviews" INTEGER NOT NULL DEFAULT 0,
    "reviewSource" TEXT,
    "source" TEXT NOT NULL DEFAULT 'AI-generated',
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "Plan_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "GroupFlow" (
    "id" TEXT NOT NULL,
    "flowId" TEXT NOT NULL,
    "cityId" TEXT NOT NULL,
    "rank" INTEGER NOT NULL,
    "title" TEXT NOT NULL,
    "description" TEXT,
    "totalHours" DOUBLE PRECISION NOT NULL,
    "startTime" TEXT,
    "endTime" TEXT,
    "totalEstimate" INTEGER,
    "currency" TEXT NOT NULL DEFAULT 'USD',
    "isWeekend" BOOLEAN NOT NULL DEFAULT false,
    "proOnly" BOOLEAN NOT NULL DEFAULT true,
    "aiGenerated" BOOLEAN NOT NULL DEFAULT true,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "GroupFlow_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "GroupFlowStep" (
    "id" TEXT NOT NULL,
    "flowId" TEXT NOT NULL,
    "planId" TEXT NOT NULL,
    "stepNumber" INTEGER NOT NULL,
    "title" TEXT NOT NULL,
    "venueName" TEXT NOT NULL,
    "duration" INTEGER NOT NULL,
    "thumbnail" TEXT,

    CONSTRAINT "GroupFlowStep_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "UserActivity" (
    "id" TEXT NOT NULL,
    "userId" TEXT NOT NULL,
    "type" "ActivityType" NOT NULL,
    "cityId" TEXT,
    "planId" TEXT,
    "flowId" TEXT,
    "source" TEXT,
    "sessionId" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "UserActivity_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "SavedCity" (
    "id" TEXT NOT NULL,
    "userId" TEXT NOT NULL,
    "cityId" TEXT NOT NULL,
    "notes" TEXT,
    "savedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "SavedCity_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "ViewedCity" (
    "id" TEXT NOT NULL,
    "userId" TEXT NOT NULL,
    "cityId" TEXT NOT NULL,
    "viewedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "viewCount" INTEGER NOT NULL DEFAULT 1,

    CONSTRAINT "ViewedCity_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "AppConfig" (
    "id" TEXT NOT NULL DEFAULT 'app',
    "currentWeek" TEXT NOT NULL,
    "weekStartDate" TIMESTAMP(3) NOT NULL,
    "weekEndDate" TIMESTAMP(3) NOT NULL,
    "freeMaxCities" INTEGER NOT NULL DEFAULT 1,
    "freeMaxPlans" INTEGER NOT NULL DEFAULT 10,
    "freeWeekendAccess" BOOLEAN NOT NULL DEFAULT false,
    "proMaxCities" INTEGER NOT NULL DEFAULT 100,
    "proMaxPlans" INTEGER NOT NULL DEFAULT 50,
    "proWeekendAccess" BOOLEAN NOT NULL DEFAULT true,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "AppConfig_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "User_clerkUserId_key" ON "User"("clerkUserId");

-- CreateIndex
CREATE UNIQUE INDEX "User_email_key" ON "User"("email");

-- CreateIndex
CREATE INDEX "User_clerkUserId_idx" ON "User"("clerkUserId");

-- CreateIndex
CREATE INDEX "User_email_idx" ON "User"("email");

-- CreateIndex
CREATE UNIQUE INDEX "Subscription_userId_key" ON "Subscription"("userId");

-- CreateIndex
CREATE UNIQUE INDEX "Subscription_clerkUserId_key" ON "Subscription"("clerkUserId");

-- CreateIndex
CREATE INDEX "Subscription_clerkUserId_idx" ON "Subscription"("clerkUserId");

-- CreateIndex
CREATE INDEX "Subscription_transactionId_idx" ON "Subscription"("transactionId");

-- CreateIndex
CREATE INDEX "Subscription_status_idx" ON "Subscription"("status");

-- CreateIndex
CREATE UNIQUE INDEX "City_cityId_key" ON "City"("cityId");

-- CreateIndex
CREATE INDEX "City_rank_idx" ON "City"("rank");

-- CreateIndex
CREATE INDEX "City_featured_idx" ON "City"("featured");

-- CreateIndex
CREATE INDEX "City_name_idx" ON "City"("name");

-- CreateIndex
CREATE UNIQUE INDEX "Plan_planId_key" ON "Plan"("planId");

-- CreateIndex
CREATE INDEX "Plan_cityId_idx" ON "Plan"("cityId");

-- CreateIndex
CREATE INDEX "Plan_rank_idx" ON "Plan"("rank");

-- CreateIndex
CREATE INDEX "Plan_isWeekend_idx" ON "Plan"("isWeekend");

-- CreateIndex
CREATE INDEX "Plan_type_idx" ON "Plan"("type");

-- CreateIndex
CREATE UNIQUE INDEX "GroupFlow_flowId_key" ON "GroupFlow"("flowId");

-- CreateIndex
CREATE INDEX "GroupFlow_cityId_idx" ON "GroupFlow"("cityId");

-- CreateIndex
CREATE INDEX "GroupFlow_rank_idx" ON "GroupFlow"("rank");

-- CreateIndex
CREATE INDEX "GroupFlowStep_flowId_idx" ON "GroupFlowStep"("flowId");

-- CreateIndex
CREATE INDEX "GroupFlowStep_planId_idx" ON "GroupFlowStep"("planId");

-- CreateIndex
CREATE UNIQUE INDEX "GroupFlowStep_flowId_stepNumber_key" ON "GroupFlowStep"("flowId", "stepNumber");

-- CreateIndex
CREATE INDEX "UserActivity_userId_idx" ON "UserActivity"("userId");

-- CreateIndex
CREATE INDEX "UserActivity_createdAt_idx" ON "UserActivity"("createdAt");

-- CreateIndex
CREATE INDEX "UserActivity_type_idx" ON "UserActivity"("type");

-- CreateIndex
CREATE INDEX "SavedCity_userId_idx" ON "SavedCity"("userId");

-- CreateIndex
CREATE INDEX "SavedCity_cityId_idx" ON "SavedCity"("cityId");

-- CreateIndex
CREATE UNIQUE INDEX "SavedCity_userId_cityId_key" ON "SavedCity"("userId", "cityId");

-- CreateIndex
CREATE INDEX "ViewedCity_userId_idx" ON "ViewedCity"("userId");

-- CreateIndex
CREATE INDEX "ViewedCity_viewedAt_idx" ON "ViewedCity"("viewedAt");

-- CreateIndex
CREATE UNIQUE INDEX "ViewedCity_userId_cityId_key" ON "ViewedCity"("userId", "cityId");
