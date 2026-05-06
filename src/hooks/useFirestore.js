import { useState, useCallback } from 'react';
import { 
  createDocument, 
  getDocument, 
  getAllDocuments, 
  updateDocument, 
  deleteDocument,
  searchPatients 
} from '../firebase/db';

export const useFirestore = (collectionName) => {
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(null);

  const create = useCallback(async (data) => {
    setLoading(true);
    setError(null);
    try {
      const result = await createDocument(collectionName, data);
      return result;
    } catch (err) {
      setError(err.message);
      throw err;
    } finally {
      setLoading(false);
    }
  }, [collectionName]);

  const get = useCallback(async (docId) => {
    setLoading(true);
    setError(null);
    try {
      const result = await getDocument(collectionName, docId);
      return result;
    } catch (err) {
      setError(err.message);
      throw err;
    } finally {
      setLoading(false);
    }
  }, [collectionName]);

  const getAll = useCallback(async (constraints = []) => {
    setLoading(true);
    setError(null);
    try {
      const result = await getAllDocuments(collectionName, constraints);
      return result;
    } catch (err) {
      setError(err.message);
      throw err;
    } finally {
      setLoading(false);
    }
  }, [collectionName]);

  const update = useCallback(async (docId, data) => {
    setLoading(true);
    setError(null);
    try {
      await updateDocument(collectionName, docId, data);
    } catch (err) {
      setError(err.message);
      throw err;
    } finally {
      setLoading(false);
    }
  }, [collectionName]);

  const remove = useCallback(async (docId) => {
    setLoading(true);
    setError(null);
    try {
      await deleteDocument(collectionName, docId);
    } catch (err) {
      setError(err.message);
      throw err;
    } finally {
      setLoading(false);
    }
  }, [collectionName]);

  return { create, get, getAll, update, remove, loading, error };
};