import { useState, useEffect } from "react";
import { collection, getDocs, addDoc, updateDoc, doc, deleteDoc } from "firebase/firestore";
import { db } from "@/lib/firebase";

export interface Category {
  id: string;
  name: string;
}

export const useCategories = () => {
  const [categories, setCategories] = useState<Category[]>([]);
  const [loading, setLoading] = useState(true);

  const fetchCategories = async () => {
    const querySnapshot = await getDocs(collection(db, "categories"));
    setCategories(querySnapshot.docs.map(doc => ({
      id: doc.id,
      name: doc.data().name
    })));
    setLoading(false);
  };

  useEffect(() => {
    fetchCategories();
  }, []);

  const addCategory = async (name: string) => {
    await addDoc(collection(db, "categories"), { name });
    await fetchCategories();
  };

  const updateCategory = async (id: string, name: string) => {
    await updateDoc(doc(db, "categories", id), { name });
    await fetchCategories();
  };

  const deleteCategory = async (id: string) => {
    await deleteDoc(doc(db, "categories", id));
    await fetchCategories();
  };

  return { categories, loading, addCategory, updateCategory, deleteCategory };
}; 