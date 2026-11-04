import React, { useState, useEffect, useRef } from "react";
import { Box, Typography, Button, Table, TableHead, TableBody, TableRow, TableCell, TableContainer, Paper, Checkbox, Chip, IconButton, Menu, MenuItem, CircularProgress, TablePagination, Tooltip, Snackbar, Alert, TextField, InputAdornment } from "@mui/material";
import PersonAddIcon from "@mui/icons-material/PersonAdd";
import EditIcon from "@mui/icons-material/Edit";
import DeleteOutlineIcon from "@mui/icons-material/DeleteOutline";
import SendIcon from "@mui/icons-material/Send";
import SearchIcon from "@mui/icons-material/Search";
import CheckCircleOutlineIcon from "@mui/icons-material/CheckCircleOutline";
import { memberService } from "../services/api";
import InviteMemberModal from "../modals/InviteMemberModal";
import EditMemberModal from "../modals/EditMemberModal";
import DeleteConfirmModal from "../modals/DeleteConfirmModal";
import { formatDate } from "../utils/formatters";

const TABLE_RADIUS = 10;

const MembersPage = () => {
  const [members, setMembers] = useState([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState("");
  const [selectedIds, setSelectedIds] = useState([]);

  // Modals
  const [isInviteOpen, setIsInviteOpen] = useState(false);
  const [editingMember, setEditingMember] = useState(null);
  const [deletingId, setDeletingId] = useState(null);
  const [isBulkDeleteConfirmOpen, setIsBulkDeleteConfirmOpen] = useState(false);
  const [actionLoading, setActionLoading] = useState(false);

  // Bulk actions menu
  const [bulkAnchorEl, setBulkAnchorEl] = useState(null);

  // Pagination
  const [page, setPage] = useState(0);
  const [rowsPerPage, setRowsPerPage] = useState(10);

  // Snackbar
  const [snackbar, setSnackbar] = useState({ open: false, message: "", severity: "success" });

  // Viewport-visibility-based sticky header and footer
  const tableContainerRef = useRef(null);
  const footerWrapperRef = useRef(null);
  const [isHeaderStuck, setIsHeaderStuck] = useState(false);
  const [isFooterSticky, setIsFooterSticky] = useState(false);
  const [tableBounds, setTableBounds] = useState({ left: 0, width: "100%" });

  useEffect(() => {
    let ticking = false;

    const checkStickyStates = () => {
      const navHeight = window.innerWidth < 600 ? 56 : 64;
      const winHeight = window.innerHeight;

      if (tableContainerRef.current) {
        const tableRect = tableContainerRef.current.getBoundingClientRect();

        setTableBounds({
          left: Math.round(tableRect.left),
          width: Math.round(tableRect.width),
        });

        // 1. Table Head: sticky when the table top has scrolled past the app bar,
        // and table rows are still in the viewport.
        const headerStuck = tableRect.top <= navHeight && tableRect.bottom > navHeight + 80;
        setIsHeaderStuck(headerStuck);

        // 2. Table Footer: sticky when table is in view,
        // BUT the natural bottom of the table (footer) is NOT seen in the viewport!
        if (footerWrapperRef.current) {
          const footerRect = footerWrapperRef.current.getBoundingClientRect();
          const isTableInView = tableRect.top < winHeight - 60 && tableRect.bottom > 100;
          const isFooterOutOfView = footerRect.top > winHeight - 52;

          setIsFooterSticky(isTableInView && isFooterOutOfView);
        }
      }
      ticking = false;
    };

    const onScrollOrResize = () => {
      if (!ticking) {
        window.requestAnimationFrame(checkStickyStates);
        ticking = true;
      }
    };

    // Initial check
    checkStickyStates();

    window.addEventListener("scroll", onScrollOrResize, { passive: true });
    window.addEventListener("resize", onScrollOrResize, { passive: true });

    return () => {
      window.removeEventListener("scroll", onScrollOrResize);
      window.removeEventListener("resize", onScrollOrResize);
    };
  }, [members, rowsPerPage, page, loading]);

  const fetchMembers = async () => {
    try {
      setLoading(true);
      const res = await memberService.getMembers(search);
      if (res.success) {
        setMembers(res.data);
      }
    } catch (err) {
      console.error("Failed to fetch members:", err);
      setSnackbar({ open: true, message: "Failed to load members from MongoDB", severity: "error" });
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchMembers();
  }, [search]);

  const handleSelectAll = (e) => {
    if (e.target.checked) {
      setSelectedIds(members.map((m) => m._id));
    } else {
      setSelectedIds([]);
    }
  };

  const handleSelectOne = (id) => {
    setSelectedIds((prev) => (prev.includes(id) ? prev.filter((item) => item !== id) : [...prev, id]));
  };

  // Delete single member
  const handleConfirmSingleDelete = async () => {
    if (!deletingId) return;
    try {
      setActionLoading(true);
      await memberService.deleteMember(deletingId);
      setSnackbar({ open: true, message: "Member deleted", severity: "success" });
      setDeletingId(null);
      setSelectedIds((prev) => prev.filter((id) => id !== deletingId));
      fetchMembers();
    } catch (err) {
      setSnackbar({ open: true, message: "Failed to delete member", severity: "error" });
    } finally {
      setActionLoading(false);
    }
  };

  // Bulk delete members
  const handleConfirmBulkDelete = async () => {
    if (selectedIds.length === 0) return;
    try {
      setActionLoading(true);
      await memberService.bulkDelete(selectedIds);
      setSnackbar({ open: true, message: `${selectedIds.length} members deleted`, severity: "success" });
      setIsBulkDeleteConfirmOpen(false);
      setSelectedIds([]);
      fetchMembers();
    } catch (err) {
      setSnackbar({ open: true, message: "Failed bulk deletion", severity: "error" });
    } finally {
      setActionLoading(false);
    }
  };

  // Send single invite link
  const handleSendInvite = async (id, memberEmail) => {
    try {
      const res = await memberService.sendInvite(id);
      if (res.success) {
        setSnackbar({ open: true, message: `Invite link sent to ${memberEmail}`, severity: "success" });
        fetchMembers();
      } else {
        setSnackbar({ open: true, message: res.message || "Failed to send invite", severity: "error" });
      }
    } catch (err) {
      setSnackbar({ open: true, message: err.response?.data?.message || err.message, severity: "error" });
    }
  };

  // Bulk send invite links
  const handleBulkSendInvites = async () => {
    setBulkAnchorEl(null);
    if (selectedIds.length === 0) return;
    try {
      const res = await memberService.bulkInvite(selectedIds);
      setSnackbar({
        open: true,
        message: res.message || `Sent invites to selected members`,
        severity: res.sentCount > 0 ? "success" : "info",
      });
      setSelectedIds([]);
      fetchMembers();
    } catch (err) {
      setSnackbar({ open: true, message: "Failed to send invites", severity: "error" });
    }
  };

  const isAllSelected = members.length > 0 && selectedIds.length === members.length;
  const isIndeterminate = selectedIds.length > 0 && selectedIds.length < members.length;

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
        <Typography variant="h5" sx={{ fontWeight: 700 }}>
          Members
        </Typography>

        <Box sx={{ display: "flex", gap: 1.5, flexWrap: "wrap", width: { xs: "100%", sm: "auto" } }}>
          <TextField
            size="small"
            placeholder="Search members..."
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            InputProps={{
              startAdornment: (
                <InputAdornment position="start">
                  <SearchIcon fontSize="small" />
                </InputAdornment>
              ),
            }}
          />

          {/* Invite Members Button */}
          <Button variant="contained" startIcon={<PersonAddIcon />} onClick={() => setIsInviteOpen(true)} size="small">
            Invite Members
          </Button>

          {/* Bulk Actions Button */}
          <Button variant="outlined" color="secondary" disabled={selectedIds.length === 0} onClick={(e) => setBulkAnchorEl(e.currentTarget)} size="small">
            Bulk Actions ({selectedIds.length})
          </Button>

          {/* Bulk Actions Menu */}
          <Menu anchorEl={bulkAnchorEl} open={Boolean(bulkAnchorEl)} onClose={() => setBulkAnchorEl(null)}>
            <MenuItem onClick={handleBulkSendInvites}>Send Invite Link</MenuItem>
            <MenuItem
              onClick={() => {
                setBulkAnchorEl(null);
                setIsBulkDeleteConfirmOpen(true);
              }}
              sx={{ color: "error.main" }}
            >
              Delete Selected
            </MenuItem>
          </Menu>
        </Box>
      </Box>

      {/* Members Table */}
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
                borderBottom: "1px solid #e2e8f0",
                boxShadow: isHeaderStuck ? "0 2px 4px rgba(0,0,0,0.06)" : "none",
                transition: "box-shadow 0.2s",
              },
              "& th:first-of-type": {
                borderTopLeftRadius: isHeaderStuck ? 0 : `${TABLE_RADIUS - 1}px`,
              },
              "& th:last-of-type": {
                borderTopRightRadius: isHeaderStuck ? 0 : `${TABLE_RADIUS - 1}px`,
              },
            }}
          >
            <TableRow>
              <TableCell
                padding="checkbox"
                sx={{
                  borderTopLeftRadius: isHeaderStuck ? 0 : `${TABLE_RADIUS - 1}px`,
                }}
              >
                <Checkbox indeterminate={isIndeterminate} checked={isAllSelected} onChange={handleSelectAll} size="small" />
              </TableCell>
              <TableCell sx={{ fontWeight: 600 }}>Full Name</TableCell>
              <TableCell sx={{ fontWeight: 600 }}>E-mail</TableCell>
              <TableCell sx={{ fontWeight: 600 }}>Phone Number</TableCell>
              <TableCell sx={{ fontWeight: 600 }}>Join Date</TableCell>
              <TableCell sx={{ fontWeight: 600 }}>Invite Status</TableCell>
              <TableCell
                sx={{
                  fontWeight: 600,
                  borderTopRightRadius: isHeaderStuck ? 0 : `${TABLE_RADIUS - 1}px`,
                }}
                align="center"
              >
                Actions
              </TableCell>
            </TableRow>
          </TableHead>
          <TableBody>
            {loading ? (
              <TableRow>
                <TableCell colSpan={7} align="center" sx={{ py: 6 }}>
                  <CircularProgress size={32} />
                </TableCell>
              </TableRow>
            ) : members.length === 0 ? (
              <TableRow>
                <TableCell colSpan={7} align="center" sx={{ py: 6, color: "text.secondary" }}>
                  No members registered. Click <strong>Invite Members +</strong> to add one.
                </TableCell>
              </TableRow>
            ) : (
              members.slice(page * rowsPerPage, page * rowsPerPage + rowsPerPage).map((row) => {
                const isSelected = selectedIds.includes(row._id);
                const formattedDate = formatDate(row.joinDate);

                return (
                  <TableRow
                    key={row._id}
                    hover
                    selected={isSelected}
                    sx={{ "&:last-child td, &:last-child th": { border: 0 } }}
                  >
                    <TableCell padding="checkbox">
                      <Checkbox checked={isSelected} onChange={() => handleSelectOne(row._id)} size="small" />
                    </TableCell>
                    <TableCell sx={{ fontWeight: 500 }}>
                      {row.fullName}
                    </TableCell>
                    <TableCell sx={{ color: row.email ? "text.primary" : "text.secondary" }}>
                      {row.email || "—"}
                    </TableCell>
                    <TableCell>{row.phoneNumber || "—"}</TableCell>
                    <TableCell>{formattedDate}</TableCell>
                    <TableCell>{row.inviteSent ? <Chip icon={<CheckCircleOutlineIcon sx={{ "&&": { fontSize: 16 } }} />} label="Invite Sent" size="small" color="success" variant="outlined" /> : <Chip label="Pending" size="small" variant="outlined" />}</TableCell>
                    <TableCell align="center">
                      <Box sx={{ display: "flex", justifyContent: "center", gap: 0.5 }}>
                        <Tooltip title={row.email ? "Send App Invite Link via Resend" : "No email available to send invite"}>
                          <span>
                            <IconButton size="small" color="primary" onClick={() => handleSendInvite(row._id, row.email)} disabled={!row.email}>
                              <SendIcon fontSize="small" />
                            </IconButton>
                          </span>
                        </Tooltip>

                        <Tooltip title="Edit Member">
                          <IconButton size="small" color="default" onClick={() => setEditingMember(row)}>
                            <EditIcon fontSize="small" />
                          </IconButton>
                        </Tooltip>

                        <Tooltip title="Delete Member">
                          <IconButton size="small" color="error" onClick={() => setDeletingId(row._id)}>
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

        {/* Pagination Footer: Sticky when not seen in viewport, docked when seen */}
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
              count={members.length}
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
      <InviteMemberModal
        open={isInviteOpen}
        onClose={() => setIsInviteOpen(false)}
        onMemberCreated={(newMember, sentLink) => {
          fetchMembers();
          setSnackbar({
            open: true,
            message: `Member created! ${sentLink ? "Invite email triggered via Resend." : ""}`,
            severity: "success",
          });
        }}
      />

      <EditMemberModal
        open={Boolean(editingMember)}
        member={editingMember}
        onClose={() => setEditingMember(null)}
        onMemberUpdated={() => {
          fetchMembers();
          setSnackbar({ open: true, message: "Member details updated successfully", severity: "success" });
        }}
      />

      {/* Single Delete Confirm */}
      <DeleteConfirmModal open={Boolean(deletingId)} onClose={() => setDeletingId(null)} onConfirm={handleConfirmSingleDelete} title="Delete Member" message="Are you sure you want to remove this member? This action cannot be reversed." loading={actionLoading} />

      {/* Bulk Delete Confirm */}
      <DeleteConfirmModal open={isBulkDeleteConfirmOpen} onClose={() => setIsBulkDeleteConfirmOpen(false)} onConfirm={handleConfirmBulkDelete} title="Bulk Delete Members" message={`Are you sure you want to delete ${selectedIds.length} selected members?`} loading={actionLoading} />

      <Snackbar open={snackbar.open} autoHideDuration={4000} onClose={() => setSnackbar((prev) => ({ ...prev, open: false }))}>
        <Alert severity={snackbar.severity} sx={{ width: "100%" }}>
          {snackbar.message}
        </Alert>
      </Snackbar>
    </Box>
  );
};

export default MembersPage;
