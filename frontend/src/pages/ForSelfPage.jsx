import React, { useState, useEffect, useRef, useMemo } from "react";
import {
  Box,
  Typography,
  Button,
  Grid,
  Card,
  CardContent,
  Table,
  TableHead,
  TableBody,
  TableRow,
  TableCell,
  TableContainer,
  Paper,
  Checkbox,
  Chip,
  Menu,
  MenuItem,
  IconButton,
  CircularProgress,
  TablePagination,
  Tooltip,
  Snackbar,
  Alert,
  TableSortLabel,
  Badge,
} from "@mui/material";
import AddIcon from "@mui/icons-material/Add";
import FilterListIcon from "@mui/icons-material/FilterList";
import DeleteOutlineIcon from "@mui/icons-material/DeleteOutline";
import EditIcon from "@mui/icons-material/Edit";
import AccountBalanceWalletIcon from "@mui/icons-material/AccountBalanceWallet";
import TrendingDownIcon from "@mui/icons-material/TrendingDown";
import SavingsIcon from "@mui/icons-material/Savings";
import CallSplitIcon from "@mui/icons-material/CallSplit";

import { forSelfService } from "../services/api";
import AddForSelfModal from "../modals/AddForSelfModal";
import EditForSelfModal from "../modals/EditForSelfModal";
import FilterForSelfModal from "../modals/FilterForSelfModal";
import { formatDate, formatTime, formatAmount } from "../utils/formatters";

const getTypeChip = (type, isSplit) => {
  const isAddBalance = (type || "").toLowerCase() === "add balance";
  return (
    <Box sx={{ display: "inline-flex", alignItems: "center", gap: 0.75 }}>
      <Chip
        label={type || "Expense"}
        size="small"
        color={isAddBalance ? "primary" : "error"}
        variant="outlined"
      />
      {isSplit && (
        <Tooltip title="Created from split expense">
          <Chip
            icon={<CallSplitIcon sx={{ "&&": { fontSize: 14 } }} />}
            label="Split"
            size="small"
            color="info"
            variant="outlined"
          />
        </Tooltip>
      )}
    </Box>
  );
};

const TABLE_RADIUS = 10;

const ForSelfPage = () => {
  const [entries, setEntries] = useState([]);
  const [stats, setStats] = useState({
    totalBalanceAdded: 0,
    totalPersonalExpenses: 0,
    netBalance: 0,
  });
  const [loading, setLoading] = useState(true);
  const [selectedIds, setSelectedIds] = useState([]);

  // Modals state
  const [isAddOpen, setIsAddOpen] = useState(false);
  const [isFilterOpen, setIsFilterOpen] = useState(false);
  const [editingEntry, setEditingEntry] = useState(null);

  // Filters state
  const [filters, setFilters] = useState({
    type: "All",
    search: "",
    description: "",
    startDate: "",
    endDate: "",
    minAmount: "",
    maxAmount: "",
  });

  // Table Sorting state
  const [order, setOrder] = useState("desc");
  const [orderBy, setOrderBy] = useState("date");

  // Pagination state
  const [page, setPage] = useState(0);
  const [rowsPerPage, setRowsPerPage] = useState(10);

  // Bulk actions menu
  const [bulkAnchorEl, setBulkAnchorEl] = useState(null);

  // Notification
  const [snackbar, setSnackbar] = useState({ open: false, message: "", severity: "success" });

  // Viewport-visibility-based sticky header and footer
  const tableContainerRef = useRef(null);
  const footerWrapperRef = useRef(null);
  const [isHeaderStuck, setIsHeaderStuck] = useState(false);
  const [isFooterSticky, setIsFooterSticky] = useState(false);
  const [tableBounds, setTableBounds] = useState({ left: 0, width: "100%" });

  // Request sort handler
  const handleRequestSort = (property) => {
    const isAsc = orderBy === property && order === "asc";
    setOrder(isAsc ? "desc" : "asc");
    setOrderBy(property);
  };

  // Sort entries comparator
  const sortedEntries = useMemo(() => {
    return [...entries].sort((a, b) => {
      let aVal = a[orderBy];
      let bVal = b[orderBy];

      if (orderBy === "date") {
        aVal = `${a.date || ""} ${a.time || ""}`;
        bVal = `${b.date || ""} ${b.time || ""}`;
      } else if (orderBy === "time") {
        aVal = a.time || "";
        bVal = b.time || "";
      } else if (orderBy === "amount") {
        aVal = Number(a.amount || 0);
        bVal = Number(b.amount || 0);
      } else if (orderBy === "type") {
        aVal = (a.type || "").toLowerCase();
        bVal = (b.type || "").toLowerCase();
      } else if (typeof aVal === "string") {
        aVal = aVal.toLowerCase();
        bVal = (bVal || "").toLowerCase();
      }

      if (aVal < bVal) return order === "asc" ? -1 : 1;
      if (aVal > bVal) return order === "asc" ? 1 : -1;
      return 0;
    });
  }, [entries, order, orderBy]);

  useEffect(() => {
    let ticking = false;

    const checkStickyStates = () => {
      const navHeight = window.innerWidth < 600 ? 56 : 64;
      const winHeight = window.innerHeight;

      if (tableContainerRef.current) {
        const rect = tableContainerRef.current.getBoundingClientRect();
        setTableBounds({ left: rect.left, width: rect.width });
        setIsHeaderStuck(rect.top <= navHeight + 1 && rect.bottom > navHeight + 80);
      }

      if (footerWrapperRef.current) {
        const fRect = footerWrapperRef.current.getBoundingClientRect();
        setIsFooterSticky(fRect.top > winHeight - 52);
      }
      ticking = false;
    };

    const onScrollOrResize = () => {
      if (!ticking) {
        window.requestAnimationFrame(checkStickyStates);
        ticking = true;
      }
    };

    window.addEventListener("scroll", onScrollOrResize, { passive: true });
    window.addEventListener("resize", onScrollOrResize, { passive: true });
    checkStickyStates();

    return () => {
      window.removeEventListener("scroll", onScrollOrResize);
      window.removeEventListener("resize", onScrollOrResize);
    };
  }, [entries, loading]);

  const fetchEntries = async () => {
    try {
      setLoading(true);
      const res = await forSelfService.getForSelfEntries(filters);
      if (res.success) {
        setEntries(res.data);
        if (res.stats) {
          setStats(res.stats);
        }
      }
    } catch (err) {
      console.error(err);
      setSnackbar({ open: true, message: "Failed to load For Self entries", severity: "error" });
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchEntries();
  }, [filters]);

  const handleSelectAll = (e) => {
    if (e.target.checked) {
      setSelectedIds(entries.map((item) => item._id));
    } else {
      setSelectedIds([]);
    }
  };

  const handleSelectOne = (id) => {
    setSelectedIds((prev) => (prev.includes(id) ? prev.filter((item) => item !== id) : [...prev, id]));
  };

  const handleDeleteSingle = async (id) => {
    try {
      await forSelfService.deleteForSelfEntry(id);
      setSelectedIds((prev) => prev.filter((item) => item !== id));
      setSnackbar({ open: true, message: "Entry deleted successfully", severity: "success" });
      fetchEntries();
    } catch (err) {
      setSnackbar({ open: true, message: "Failed to delete entry", severity: "error" });
    }
  };

  const handleBulkDelete = async () => {
    setBulkAnchorEl(null);
    if (selectedIds.length === 0) return;
    try {
      await forSelfService.bulkDelete(selectedIds);
      setSnackbar({ open: true, message: `${selectedIds.length} entries deleted successfully`, severity: "success" });
      setSelectedIds([]);
      fetchEntries();
    } catch (err) {
      setSnackbar({ open: true, message: "Failed bulk deletion", severity: "error" });
    }
  };

  const isAllSelected = entries.length > 0 && selectedIds.length === entries.length;
  const isIndeterminate = selectedIds.length > 0 && selectedIds.length < entries.length;

  // Count active filters
  const activeFiltersCount = useMemo(() => {
    let count = 0;
    if (filters.type && filters.type !== "All") count++;
    if (filters.startDate) count++;
    if (filters.endDate) count++;
    if (filters.minAmount) count++;
    if (filters.maxAmount) count++;
    if (filters.description) count++;
    return count;
  }, [filters]);

  return (
    <Box sx={{ p: { xs: 2, sm: 3 } }}>
      {/* Top Header & Actions */}
      <Box
        sx={{
          display: "flex",
          flexDirection: { xs: "column", sm: "row" },
          justifyContent: "space-between",
          alignItems: { xs: "flex-start", sm: "center" },
          gap: 2,
          mb: 3,
        }}
      >
        <Box>
          <Typography variant="h5" sx={{ fontWeight: 700 }}>
            For Self
          </Typography>
          <Typography variant="body2" color="text.secondary">
            Personal balance deposits and individual expenses
          </Typography>
        </Box>

        <Box sx={{ display: "flex", gap: 1.5, flexWrap: "wrap", width: { xs: "100%", sm: "auto" } }}>
          {/* Filter Button */}
          <Badge badgeContent={activeFiltersCount} color="primary">
            <Button
              variant="outlined"
              startIcon={<FilterListIcon />}
              onClick={() => setIsFilterOpen(true)}
              size="small"
            >
              Filter
            </Button>
          </Badge>

          {/* Add For Self Button */}
          <Button
            variant="contained"
            startIcon={<AddIcon />}
            onClick={() => setIsAddOpen(true)}
            size="small"
          >
            Add For Self
          </Button>

          {/* Bulk Actions Button */}
          <Button
            variant="outlined"
            color="secondary"
            disabled={selectedIds.length === 0}
            onClick={(e) => setBulkAnchorEl(e.currentTarget)}
            size="small"
          >
            Bulk Actions ({selectedIds.length})
          </Button>

          {/* Bulk Actions Menu */}
          <Menu anchorEl={bulkAnchorEl} open={Boolean(bulkAnchorEl)} onClose={() => setBulkAnchorEl(null)}>
            <MenuItem onClick={handleBulkDelete} sx={{ color: "error.main" }}>
              Delete Selected
            </MenuItem>
          </Menu>
        </Box>
      </Box>

      {/* KPI Summary Cards */}
      <Grid container spacing={2.5} sx={{ mb: 3 }}>
        <Grid item xs={12} sm={4}>
          <Card
            elevation={0}
            sx={{
              p: 2,
              borderRadius: 3,
              border: "1px solid #e2e8f0",
              bgcolor: "#ffffff",
              transition: "transform 0.2s, box-shadow 0.2s",
              "&:hover": {
                transform: "translateY(-2px)",
                boxShadow: "0 6px 20px rgba(0,0,0,0.06)",
              },
            }}
          >
            <CardContent sx={{ p: "0 !important" }}>
              <Box sx={{ display: "flex", justifyContent: "space-between", alignItems: "flex-start" }}>
                <Box>
                  <Typography variant="body2" color="text.secondary" sx={{ fontWeight: 600, mb: 0.5 }}>
                    Total Balance Added
                  </Typography>
                  <Typography variant="h5" sx={{ fontWeight: 700, color: "primary.main" }}>
                    ₹ {formatAmount(stats.totalBalanceAdded)}
                  </Typography>
                </Box>
                <Box
                  sx={{
                    p: 1.25,
                    borderRadius: 2,
                    bgcolor: "rgba(25, 118, 210, 0.08)",
                    color: "primary.main",
                  }}
                >
                  <AccountBalanceWalletIcon />
                </Box>
              </Box>
            </CardContent>
          </Card>
        </Grid>

        <Grid item xs={12} sm={4}>
          <Card
            elevation={0}
            sx={{
              p: 2,
              borderRadius: 3,
              border: "1px solid #e2e8f0",
              bgcolor: "#ffffff",
              transition: "transform 0.2s, box-shadow 0.2s",
              "&:hover": {
                transform: "translateY(-2px)",
                boxShadow: "0 6px 20px rgba(0,0,0,0.06)",
              },
            }}
          >
            <CardContent sx={{ p: "0 !important" }}>
              <Box sx={{ display: "flex", justifyContent: "space-between", alignItems: "flex-start" }}>
                <Box>
                  <Typography variant="body2" color="text.secondary" sx={{ fontWeight: 600, mb: 0.5 }}>
                    Personal Expenses
                  </Typography>
                  <Typography variant="h5" sx={{ fontWeight: 700, color: "error.main" }}>
                    ₹ {formatAmount(stats.totalPersonalExpenses)}
                  </Typography>
                </Box>
                <Box
                  sx={{
                    p: 1.25,
                    borderRadius: 2,
                    bgcolor: "rgba(211, 47, 47, 0.08)",
                    color: "error.main",
                  }}
                >
                  <TrendingDownIcon />
                </Box>
              </Box>
            </CardContent>
          </Card>
        </Grid>

        <Grid item xs={12} sm={4}>
          <Card
            elevation={0}
            sx={{
              p: 2,
              borderRadius: 3,
              border: "1px solid #e2e8f0",
              bgcolor: "#ffffff",
              transition: "transform 0.2s, box-shadow 0.2s",
              "&:hover": {
                transform: "translateY(-2px)",
                boxShadow: "0 6px 20px rgba(0,0,0,0.06)",
              },
            }}
          >
            <CardContent sx={{ p: "0 !important" }}>
              <Box sx={{ display: "flex", justifyContent: "space-between", alignItems: "flex-start" }}>
                <Box>
                  <Typography variant="body2" color="text.secondary" sx={{ fontWeight: 600, mb: 0.5 }}>
                    Net Personal Balance
                  </Typography>
                  <Typography
                    variant="h5"
                    sx={{
                      fontWeight: 700,
                      color: stats.netBalance >= 0 ? "success.main" : "error.main",
                    }}
                  >
                    ₹ {formatAmount(stats.netBalance)}
                  </Typography>
                </Box>
                <Box
                  sx={{
                    p: 1.25,
                    borderRadius: 2,
                    bgcolor: stats.netBalance >= 0 ? "rgba(46, 125, 50, 0.08)" : "rgba(211, 47, 47, 0.08)",
                    color: stats.netBalance >= 0 ? "success.main" : "error.main",
                  }}
                >
                  <SavingsIcon />
                </Box>
              </Box>
            </CardContent>
          </Card>
        </Grid>
      </Grid>

      {/* For Self Data Table */}
      <TableContainer
        ref={tableContainerRef}
        component={Paper}
        sx={{
          borderRadius: `${TABLE_RADIUS}px`,
          border: "1px solid #e2e8f0",
          boxShadow: "none",
          overflow: "visible",
        }}
      >
        <Table sx={{ minWidth: 650 }}>
          <TableHead
            sx={{
              bgcolor: "transparent",
              position: "sticky",
              top: { xs: 56, sm: 64 },
              zIndex: 5,
              "& tr": {
                bgcolor: "transparent",
              },
              "& th": {
                bgcolor: "#f8fafc",
                position: "sticky",
                top: { xs: 56, sm: 64 },
                zIndex: 5,
                fontWeight: 700,
                color: "text.primary",
                boxShadow: isHeaderStuck ? "0 2px 8px rgba(0,0,0,0.08)" : "none",
                transition: "box-shadow 0.2s, background-color 0.2s",
                borderBottom: "1px solid #e2e8f0",
              },
              "& th:first-of-type": {
                borderTopLeftRadius: isHeaderStuck ? 0 : `${TABLE_RADIUS}px`,
              },
              "& th:last-of-type": {
                borderTopRightRadius: isHeaderStuck ? 0 : `${TABLE_RADIUS}px`,
              },
            }}
          >
            <TableRow>
              <TableCell padding="checkbox">
                <Checkbox
                  indeterminate={isIndeterminate}
                  checked={isAllSelected}
                  onChange={handleSelectAll}
                  disabled={entries.length === 0}
                />
              </TableCell>
              <TableCell sortDirection={orderBy === "date" ? order : false}>
                <TableSortLabel
                  active={orderBy === "date"}
                  direction={orderBy === "date" ? order : "asc"}
                  onClick={() => handleRequestSort("date")}
                >
                  Date
                </TableSortLabel>
              </TableCell>
              <TableCell sortDirection={orderBy === "time" ? order : false}>
                <TableSortLabel
                  active={orderBy === "time"}
                  direction={orderBy === "time" ? order : "asc"}
                  onClick={() => handleRequestSort("time")}
                >
                  Time
                </TableSortLabel>
              </TableCell>
              <TableCell sortDirection={orderBy === "type" ? order : false}>
                <TableSortLabel
                  active={orderBy === "type"}
                  direction={orderBy === "type" ? order : "asc"}
                  onClick={() => handleRequestSort("type")}
                >
                  Type
                </TableSortLabel>
              </TableCell>
              <TableCell>Description</TableCell>
              <TableCell align="right" sortDirection={orderBy === "amount" ? order : false}>
                <TableSortLabel
                  active={orderBy === "amount"}
                  direction={orderBy === "amount" ? order : "asc"}
                  onClick={() => handleRequestSort("amount")}
                >
                  Amount
                </TableSortLabel>
              </TableCell>
              <TableCell align="center">Actions</TableCell>
            </TableRow>
          </TableHead>

          <TableBody>
            {loading ? (
              <TableRow>
                <TableCell colSpan={7} align="center" sx={{ py: 6 }}>
                  <CircularProgress size={32} />
                  <Typography variant="body2" color="text.secondary" sx={{ mt: 1 }}>
                    Loading For Self entries...
                  </Typography>
                </TableCell>
              </TableRow>
            ) : entries.length === 0 ? (
              <TableRow>
                <TableCell colSpan={7} align="center" sx={{ py: 6 }}>
                  <Typography variant="body1" sx={{ fontWeight: 600, color: "text.secondary" }}>
                    No entries found
                  </Typography>
                  <Typography variant="body2" color="text.secondary" sx={{ mt: 0.5 }}>
                    {activeFiltersCount > 0
                      ? "Try adjusting your filter settings"
                      : "Add your first personal expense or balance deposit using the button above"}
                  </Typography>
                  {activeFiltersCount === 0 && (
                    <Button
                      variant="contained"
                      size="small"
                      startIcon={<AddIcon />}
                      onClick={() => setIsAddOpen(true)}
                      sx={{ mt: 2 }}
                    >
                      Add For Self
                    </Button>
                  )}
                </TableCell>
              </TableRow>
            ) : (
              sortedEntries.slice(page * rowsPerPage, page * rowsPerPage + rowsPerPage).map((row) => {
                const isSelected = selectedIds.includes(row._id);
                const isAddBalance = (row.type || "").toLowerCase() === "add balance";

                return (
                  <TableRow
                    key={row._id}
                    hover
                    selected={isSelected}
                    sx={{
                      "&:last-child td, &:last-child th": { border: 0 },
                    }}
                  >
                    <TableCell padding="checkbox">
                      <Checkbox
                        checked={isSelected}
                        onChange={() => handleSelectOne(row._id)}
                      />
                    </TableCell>
                    <TableCell sx={{ whiteSpace: "nowrap" }}>{formatDate(row.date)}</TableCell>
                    <TableCell sx={{ whiteSpace: "nowrap" }}>{formatTime(row.time)}</TableCell>
                    <TableCell>{getTypeChip(row.type, row.isSplit)}</TableCell>
                    <TableCell sx={{ maxWidth: 300 }}>
                      <Typography variant="body2" sx={{ wordBreak: "break-word" }}>
                        {row.description || "-"}
                      </Typography>
                    </TableCell>
                    <TableCell
                      align="right"
                      sx={{
                        fontWeight: 700,
                        color: isAddBalance ? "primary.main" : "text.primary",
                      }}
                    >
                      {isAddBalance ? "+ " : "- "}₹ {formatAmount(row.amount)}
                    </TableCell>
                    <TableCell align="center">
                      <Box sx={{ display: "flex", justifyContent: "center", gap: 0.5 }}>
                        <Tooltip title="Edit entry">
                          <IconButton size="small" color="primary" onClick={() => setEditingEntry(row)}>
                            <EditIcon fontSize="small" />
                          </IconButton>
                        </Tooltip>
                        <Tooltip title="Delete entry">
                          <IconButton size="small" color="error" onClick={() => handleDeleteSingle(row._id)}>
                            <DeleteOutlineIcon fontSize="small" />
                          </IconButton>
                        </Tooltip>
                      </Box>
                    </TableCell>
                  </TableRow>
                );
              })
            )}
          </TableBody>
        </Table>

        {/* Pagination Footer */}
        <Box
          ref={footerWrapperRef}
          sx={{
            minHeight: 52,
            position: "relative",
            borderBottomLeftRadius: `${TABLE_RADIUS - 1}px`,
            borderBottomRightRadius: `${TABLE_RADIUS - 1}px`,
            overflow: isFooterSticky ? "visible" : "hidden",
          }}
        >
          <Box
            sx={{
              position: isFooterSticky ? "fixed" : "static",
              bottom: 0,
              left: isFooterSticky && tableBounds.left !== undefined ? `${tableBounds.left}px` : "auto",
              width: isFooterSticky && tableBounds.width ? `${tableBounds.width}px` : "100%",
              maxWidth: isFooterSticky && tableBounds.width ? `${tableBounds.width}px` : "none",
              boxSizing: "border-box",
              zIndex: 10,
              bgcolor: "background.paper",
              borderTop: "1px solid #e2e8f0",
              borderLeft: isFooterSticky ? "1px solid #e2e8f0" : "none",
              borderRight: isFooterSticky ? "1px solid #e2e8f0" : "none",
              borderTopLeftRadius: isFooterSticky ? `${TABLE_RADIUS}px` : 0,
              borderTopRightRadius: isFooterSticky ? `${TABLE_RADIUS}px` : 0,
              borderBottomLeftRadius: isFooterSticky ? 0 : `${TABLE_RADIUS - 1}px`,
              borderBottomRightRadius: isFooterSticky ? 0 : `${TABLE_RADIUS - 1}px`,
              boxShadow: isFooterSticky ? "0 -4px 16px rgba(0,0,0,0.10)" : "none",
              transition: "box-shadow 0.2s, background-color 0.2s",
            }}
          >
            <TablePagination
              rowsPerPageOptions={[5, 10, 20, 50, 100]}
              component="div"
              count={entries.length}
              rowsPerPage={rowsPerPage}
              page={page}
              onPageChange={(e, newPage) => setPage(newPage)}
              onRowsPerPageChange={(e) => {
                setRowsPerPage(parseInt(e.target.value, 10));
                setPage(0);
              }}
              sx={{
                borderBottomLeftRadius: isFooterSticky ? 0 : `${TABLE_RADIUS - 1}px`,
                borderBottomRightRadius: isFooterSticky ? 0 : `${TABLE_RADIUS - 1}px`,
                "& .MuiTablePagination-toolbar": {
                  borderBottomLeftRadius: isFooterSticky ? 0 : `${TABLE_RADIUS - 1}px`,
                  borderBottomRightRadius: isFooterSticky ? 0 : `${TABLE_RADIUS - 1}px`,
                },
              }}
            />
          </Box>
        </Box>
      </TableContainer>

      {/* Modals */}
      <AddForSelfModal
        open={isAddOpen}
        onClose={() => setIsAddOpen(false)}
        onEntryCreated={() => {
          fetchEntries();
          setSnackbar({ open: true, message: "For Self entry created successfully", severity: "success" });
        }}
      />

      <EditForSelfModal
        open={Boolean(editingEntry)}
        entry={editingEntry}
        onClose={() => setEditingEntry(null)}
        onEntryUpdated={() => {
          fetchEntries();
          setSnackbar({ open: true, message: "Entry updated successfully", severity: "success" });
        }}
      />

      <FilterForSelfModal
        open={isFilterOpen}
        onClose={() => setIsFilterOpen(false)}
        currentFilters={filters}
        onApplyFilters={(applied) => setFilters(applied)}
        onResetFilters={() =>
          setFilters({
            type: "All",
            search: "",
            description: "",
            startDate: "",
            endDate: "",
            minAmount: "",
            maxAmount: "",
          })
        }
      />

      {/* Snackbar feedback */}
      <Snackbar
        open={snackbar.open}
        autoHideDuration={4000}
        onClose={() => setSnackbar((prev) => ({ ...prev, open: false }))}
        anchorOrigin={{ vertical: "bottom", horizontal: "center" }}
      >
        <Alert
          onClose={() => setSnackbar((prev) => ({ ...prev, open: false }))}
          severity={snackbar.severity}
          variant="filled"
          sx={{ width: "100%" }}
        >
          {snackbar.message}
        </Alert>
      </Snackbar>
    </Box>
  );
};

export default ForSelfPage;
