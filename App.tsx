import React, { useEffect, useState } from "react";
import { Routes, Route, Navigate } from "react-router-dom";
import LandingPage from "./components/admin/LandingPage";
import OutletLogin from "./components/admin/OutletLogin";
import Login from "./components/admin/Login";
import FounderHQ from "./components/admin/FounderHQ";
import InventoryApp from "./components/admin/InventoryApp";
import AdminLayout from "./components/admin/AdminLayout";
import AdminHome from "./components/admin/AdminHome";
import MenuMaster from "./components/admin/MenuMaster";
import TableQRManager from "./components/admin/TableQRManager";
import KasirHome from "./components/kasir/KasirHome";
import WaiterApp from "./components/waiter/WaiterApp";
import ProtocolLock from "./components/admin/ProtocolLock";
import Paket from "./components/admin/Paket";
import RecipeManagement from "./components/admin/RecipeManagement";
import HPPCalculator from "./components/admin/HPPCalculator";
import MarketingApp from "./components/admin/MarketingApp";
import OrderHistory from "./components/admin/OrderHistory";
import ShiftReports from "./components/admin/ShiftReports";
import UserManagement from "./components/admin/UserManagement";
import TableLayout from "./components/admin/TableLayout";
import OutletProfile from "./components/admin/OutletProfile";
import MerchantBank from "./components/admin/MerchantBank";
import PrinterSettings from "./components/admin/PrinterSettings";
import ReceiptSettings from "./components/admin/ReceiptSettings";

export default function App(){

const [ready,setReady] = useState(false);


const [auth,setAuth]=useState({

isFounder:false,
isAdmin:false,
isManager:false,
isKasir:false,
isWaiter:false,
hasTenantId:false,
licenseActive:true,
defaultRoute:"/outlet-login"

});



useEffect(()=>{


const username =
(localStorage.getItem("username") || "")
.trim()
.toUpperCase();


const role =
(localStorage.getItem("role") || "")
.trim()
.toLowerCase();


const supreme =
      localStorage.getItem("supreme_auth") === "true";

const tenantId =
localStorage.getItem("tenant_id") || "";



console.log("AUTH CHECK");
console.log({
username,
role,
supreme,
tenantId
});



// ========================
// FOUNDER PRIORITY
// ========================

const isFounder =
  supreme ||
  role === "founder" ||
  role === "supreme_founder";

// ========================
// OTHER USER
// ========================

const isAdmin =
  role === "admin";

const isManager =
  role === "manager";

const isKasir =
  role === "kasir";

const isWaiter =
  role === "waiter";

const hasTenantId =
Boolean(tenantId);



let defaultRoute="/outlet-login";



if(isFounder){

defaultRoute="/founder";

}
else if(isAdmin && hasTenantId){

defaultRoute="/admin/dashboard";

}
else if(isManager && hasTenantId){

defaultRoute="/admin/dashboard";

}
else if(isKasir && hasTenantId){

defaultRoute="/dashboard";

}
else if(isWaiter && hasTenantId){

defaultRoute="/dashboard";

}



setAuth({

isFounder,
isAdmin,
isManager,
isKasir,
isWaiter,
hasTenantId,
licenseActive:true,
defaultRoute

});


setReady(true);



},[]);



if(!ready){

return null;

}




if(!auth.licenseActive && !auth.isFounder){

return <ProtocolLock/>;

}




return(

<Routes>


<Route 
path="/" 
element={<LandingPage/>}
/>



<Route 
path="/landing" 
element={<LandingPage/>}
/>





{/* =========================
      DISBA CENTRAL FOUNDER
========================= */}


<Route
path="/founder"
element={
<FounderHQ/>
}
/>

<Route
  path="/admin/qr"
  element={
    auth.isAdmin && auth.hasTenantId ? (
      <AdminLayout>
        <TableQRManager />
      </AdminLayout>
    ) : (
      <Navigate to={auth.defaultRoute} replace />
    )
  }
/>

<Route
  path="/admin/inventory"
  element={
    auth.isAdmin && auth.hasTenantId ? (
      <AdminLayout>
        <InventoryApp />
      </AdminLayout>
    ) : (
      <Navigate to={auth.defaultRoute} replace />
    )
  }
/>

<Route
  path="/admin/paket"
  element={
    auth.isAdmin && auth.hasTenantId ? (
      <AdminLayout>
        <Paket />
      </AdminLayout>
    ) : (
      <Navigate to={auth.defaultRoute} replace />
    )
  }
/>

<Route
  path="/admin/recipes"
  element={
    auth.isAdmin && auth.hasTenantId ? (
      <AdminLayout>
        <RecipeManagement />
      </AdminLayout>
    ) : (
      <Navigate to={auth.defaultRoute} replace />
    )
  }
/>

<Route
  path="/admin/hpp-calculator"
  element={
    auth.isAdmin && auth.hasTenantId ? (
      <AdminLayout>
        <HPPCalculator />
      </AdminLayout>
    ) : (
      <Navigate to={auth.defaultRoute} replace />
    )
  }
/>

<Route
  path="/admin/customers"
  element={
    auth.isAdmin && auth.hasTenantId ? (
      <AdminLayout>
        <MarketingApp />
      </AdminLayout>
    ) : (
      <Navigate to={auth.defaultRoute} replace />
    )
  }
/>

<Route
  path="/admin/history"
  element={
    auth.isAdmin && auth.hasTenantId ? (
      <AdminLayout>
        <OrderHistory />
      </AdminLayout>
    ) : (
      <Navigate to={auth.defaultRoute} replace />
    )
  }
/>

<Route
  path="/admin/shifts"
  element={
    auth.isAdmin && auth.hasTenantId ? (
      <AdminLayout>
        <ShiftReports />
      </AdminLayout>
    ) : (
      <Navigate to={auth.defaultRoute} replace />
    )
  }
/>


{/* =========================
      PENGATURAN 
========================= */}
<Route
  path="/admin/settings/users"
  element={
    auth.isAdmin && auth.hasTenantId ? (
      <AdminLayout>
        <UserManagement />
      </AdminLayout>
    ) : (
      <Navigate to={auth.defaultRoute} replace />
    )
  }
/>

<Route
  path="/admin/settings/tables"
  element={
    auth.isAdmin && auth.hasTenantId ? (
      <AdminLayout>
        <TableLayout />
      </AdminLayout>
    ) : (
      <Navigate to={auth.defaultRoute} replace />
    )
  }
/>

<Route
  path="/admin/settings/profile"
  element={
    auth.isAdmin && auth.hasTenantId ? (
      <AdminLayout>
        <OutletProfile />
      </AdminLayout>
    ) : (
      <Navigate to={auth.defaultRoute} replace />
    )
  }
/>

<Route
  path="/admin/settings/payments"
  element={
    auth.isAdmin && auth.hasTenantId ? (
      <AdminLayout>
        <MerchantBank />
      </AdminLayout>
    ) : (
      <Navigate to={auth.defaultRoute} replace />
    )
  }
/>

<Route
  path="/admin/settings/printer"
  element={
    auth.isAdmin && auth.hasTenantId ? (
      <AdminLayout>
        <PrinterSettings />
      </AdminLayout>
    ) : (
      <Navigate to={auth.defaultRoute} replace />
    )
  }
/>
<Route
  path="/admin/settings/receipt"
  element={
    auth.isAdmin && auth.hasTenantId ? (
      <AdminLayout>
        <ReceiptSettings />
      </AdminLayout>
    ) : (
      <Navigate to={auth.defaultRoute} replace />
    )
  }
/>

{/* =========================
      ADMIN OUTLET
========================= */}



<Route

path="/admin"

element={

<Navigate 
to="/admin/dashboard"
replace
/>

}

/>



<Route

path="/admin/dashboard"

element={

(auth.isAdmin || auth.isManager) && auth.hasTenantId
?

<AdminLayout>

<AdminHome/>

</AdminLayout>

:

<Navigate 
to={auth.defaultRoute}
replace
/>

}

/>





<Route

path="/admin/menu"

element={

auth.isAdmin && auth.hasTenantId

?

<AdminLayout>

<MenuMaster/>

</AdminLayout>

:

<Navigate 
to={auth.defaultRoute}
replace
/>

}

/>





{/* =========================
      KASIR / WAITER
========================= */}



<Route

path="/dashboard"

element={


auth.isKasir && auth.hasTenantId

?

<KasirHome/>

:

auth.isWaiter && auth.hasTenantId

?

<WaiterApp/>

:

<Navigate 
to={auth.defaultRoute}
replace
/>

}

/>





<Route

path="/login"

element={<Login/>}

/>



<Route

path="/outlet-login"

element={<OutletLogin/>}

/>



<Route

path="*"

element={

<Navigate 
to={auth.defaultRoute}
replace
/>

}

/>


</Routes>

)

}