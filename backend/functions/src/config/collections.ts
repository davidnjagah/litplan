/**
 * Firestore Collections
 *
 * This file defines typed collection references for all Firestore collections.
 * Import these references throughout the application for type-safe database access.
 */

import { db } from './firestore';
import type { User } from '../models/User';
import type { City } from '../models/City';
import type { Plan } from '../models/Plan';
import type { GroupFlow } from '../models/GroupFlow';

/**
 * Collection References
 */

// Users collection
export const usersCollection = db.collection('users');

// Cities collection
export const citiesCollection = db.collection('cities');

// Config collection (app-wide configuration)
export const configCollection = db.collection('config');

/**
 * Subcollection References
 * These require a parent document ID
 */

// Plans subcollection under a city
export const getPlansCollection = (cityId: string) => {
  return citiesCollection.doc(cityId).collection('plans');
};

// Group flows subcollection under a city
export const getGroupFlowsCollection = (cityId: string) => {
  return citiesCollection.doc(cityId).collection('groupFlows');
};

// User activity subcollection under a user
export const getUserActivityCollection = (userId: string) => {
  return usersCollection.doc(userId).collection('activity');
};

// Saved cities subcollection under a user
export const getSavedCitiesCollection = (userId: string) => {
  return usersCollection.doc(userId).collection('savedCities');
};

/**
 * Document References
 */

// Get user document reference
export const getUserDoc = (userId: string) => {
  return usersCollection.doc(userId);
};

// Get city document reference
export const getCityDoc = (cityId: string) => {
  return citiesCollection.doc(cityId);
};

// Get plan document reference
export const getPlanDoc = (cityId: string, planId: string) => {
  return getPlansCollection(cityId).doc(planId);
};

// Get group flow document reference
export const getGroupFlowDoc = (cityId: string, flowId: string) => {
  return getGroupFlowsCollection(cityId).doc(flowId);
};

// Get app config document reference
export const getAppConfigDoc = () => {
  return configCollection.doc('app');
};

/**
 * Type-safe collection helpers
 */

// Typed user data
export const getUserData = async (userId: string): Promise<User | null> => {
  const doc = await getUserDoc(userId).get();
  return doc.exists ? (doc.data() as User) : null;
};

// Typed city data
export const getCityData = async (cityId: string): Promise<City | null> => {
  const doc = await getCityDoc(cityId).get();
  return doc.exists ? (doc.data() as City) : null;
};

// Typed plan data
export const getPlanData = async (
  cityId: string,
  planId: string
): Promise<Plan | null> => {
  const doc = await getPlanDoc(cityId, planId).get();
  return doc.exists ? (doc.data() as Plan) : null;
};

// Typed group flow data
export const getGroupFlowData = async (
  cityId: string,
  flowId: string
): Promise<GroupFlow | null> => {
  const doc = await getGroupFlowDoc(cityId, flowId).get();
  return doc.exists ? (doc.data() as GroupFlow) : null;
};

/**
 * Batch operations helpers
 */

// Get all cities
export const getAllCities = async (): Promise<City[]> => {
  const snapshot = await citiesCollection.orderBy('rank', 'asc').get();
  return snapshot.docs.map((doc) => doc.data() as City);
};

// Get all plans for a city
export const getAllPlansForCity = async (
  cityId: string,
  limit?: number
): Promise<Plan[]> => {
  let query = getPlansCollection(cityId).orderBy('rank', 'asc');

  if (limit) {
    query = query.limit(limit) as any;
  }

  const snapshot = await query.get();
  return snapshot.docs.map((doc) => doc.data() as Plan);
};

// Get all group flows for a city
export const getAllGroupFlowsForCity = async (
  cityId: string,
  limit?: number
): Promise<GroupFlow[]> => {
  let query = getGroupFlowsCollection(cityId).orderBy('rank', 'asc');

  if (limit) {
    query = query.limit(limit) as any;
  }

  const snapshot = await query.get();
  return snapshot.docs.map((doc) => doc.data() as GroupFlow);
};

/**
 * Export collection names as constants for security rules and scripts
 */
export const COLLECTION_NAMES = {
  USERS: 'users',
  CITIES: 'cities',
  CONFIG: 'config',
  PLANS: 'plans',
  GROUP_FLOWS: 'groupFlows',
  ACTIVITY: 'activity',
  SAVED_CITIES: 'savedCities',
} as const;
