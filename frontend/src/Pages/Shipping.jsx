import { Navigate } from "react-router-dom";

/** @deprecated Use /shipping-delivery */
export default function Shipping() {
  return <Navigate to="/shipping-delivery" replace />;
}
