"use client";

import { JSX, useState } from "react";
import DocumentGroupSelector from "@/components/DocumentGroupSelector";
import { FileInfo, DocumentGroup } from "../types";
import React from "react";
import { Card, CardContent } from "@/components/ui/card";

type DocumentsTabProps = {
  files: FileInfo[];
  groups: DocumentGroup[];
  loading: boolean;
  deleting: string | null;
  uploading: boolean;
  selectedGroupId: string;
  setSelectedGroupId: (id: string) => void;
  expandedGroups: Record<string, boolean>;
  showAllGroups: boolean;
  setShowAllGroups: (show: boolean) => void;
  fetchFiles: (groupId: string) => Promise<void>;
  fetchAllFiles: () => Promise<void>;
  handleDelete: (file: FileInfo) => Promise<void>;
  handleUpload: (e: React.FormEvent<HTMLFormElement>) => Promise<void>;
  toggleAccordion: (groupId: string) => void;
  getFilesByGroup: () => { groupId: string; groupName: string; files: FileInfo[] }[];
  renderFileItem: (file: FileInfo) => JSX.Element;
};

export function DocumentsTab({
  files,
  groups,
  loading,
  deleting,
  uploading,
  selectedGroupId,
  setSelectedGroupId,
  expandedGroups,
  showAllGroups,
  setShowAllGroups,
  fetchFiles,
  fetchAllFiles,
  handleDelete,
  handleUpload,
  toggleAccordion,
  getFilesByGroup,
  renderFileItem
}: DocumentsTabProps) {
  return (
    <Card>
      <CardContent className="">
      <div className="flex flex-col md:flex-row gap-4 md:items-end">
        <div className="flex-1">
          <DocumentGroupSelector
            onSelect={(groupId) => {
              setSelectedGroupId(groupId);
              setShowAllGroups(false);
            }}
            selectedGroupId={selectedGroupId}
            className="w-full"
          />
        </div>
        
        {/* <div className="flex gap-2">
          <button
            type="button"
            onClick={() => {
              setShowAllGroups(true);
              fetchAllFiles();
            }}
            className={`px-3 py-2 rounded text-sm ${
              showAllGroups
                ? "bg-black text-white dark:bg-white dark:text-black"
                : "bg-zinc-100 text-zinc-800 hover:bg-zinc-200 dark:bg-zinc-800 dark:text-zinc-200 dark:hover:bg-zinc-700"
            } transition`}
          >
            Show All Documents
          </button>
        </div> */}
      </div>
      
      <div className="border-zinc-200 dark:border-zinc-800 pt-6">
        <form onSubmit={handleUpload} className="mb-6">
          <div className="flex flex-col md:flex-row gap-4">
            <div className="flex-1">
              <label className="block text-sm font-medium text-zinc-700 dark:text-zinc-300 mb-1">
                Upload Files
              </label>
              <input
                type="file"
                name="file"
                multiple
                className="block w-full text-sm text-zinc-900 dark:text-zinc-100 
                  file:mr-4 file:py-2 file:px-4
                  file:rounded file:border-0
                  file:text-sm file:font-medium
                  file:bg-zinc-100 file:text-zinc-800
                  dark:file:bg-zinc-800 dark:file:text-zinc-200
                  hover:file:bg-zinc-200 dark:hover:file:bg-zinc-700"
              />
            </div>
            <div className="flex items-end">
              <button
                type="submit"
                disabled={uploading || !selectedGroupId}
                className="px-4 py-2 bg-black text-white rounded hover:bg-zinc-800 disabled:opacity-50 transition"
              >
                {uploading ? "Uploading..." : "Upload"}
              </button>
            </div>
          </div>
          {!selectedGroupId && !showAllGroups && (
            <p className="mt-2 text-sm text-red-600">
              Please select a document group first
            </p>
          )}
        </form>
        
        {loading ? (
          <div className="space-y-4">
            <div className="animate-pulse h-12 bg-zinc-200 dark:bg-zinc-700 rounded"></div>
            <div className="animate-pulse h-32 bg-zinc-200 dark:bg-zinc-700 rounded"></div>
          </div>
        ) : (
          <div>
            {showAllGroups ? (
              <div className="space-y-4">
                {(() => {
                  const filesByGroup = getFilesByGroup();
                  const ungroupedFiles = files.filter(
                    (file) => !file.groupId
                  );

                  return (
                    <>
                      {filesByGroup.map(({ groupId, groupName, files }) => (
                        <div
                          key={groupId}
                          className="border border-zinc-200 dark:border-zinc-700 rounded-lg overflow-hidden"
                        >
                          <button
                            onClick={() => toggleAccordion(groupId)}
                            className="w-full flex items-center justify-between p-4 bg-zinc-50 dark:bg-zinc-800 hover:bg-zinc-100 dark:hover:bg-zinc-700 transition"
                          >
                            <div className="flex items-center">
                              <span className="font-medium">{groupName}</span>
                              <span className="ml-2 text-xs bg-zinc-200 dark:bg-zinc-700 text-zinc-700 dark:text-zinc-300 px-2 py-0.5 rounded-full">
                                {files.length} file{files.length !== 1 ? "s" : ""}
                              </span>
                            </div>
                            <svg
                              className={`w-5 h-5 transition-transform ${
                                expandedGroups[groupId]
                                  ? "transform rotate-180"
                                  : ""
                              }`}
                              fill="none"
                              stroke="currentColor"
                              viewBox="0 0 24 24"
                              xmlns="http://www.w3.org/2000/svg"
                            >
                              <path
                                strokeLinecap="round"
                                strokeLinejoin="round"
                                strokeWidth={2}
                                d="M19 9l-7 7-7-7"
                              />
                            </svg>
                          </button>

                          {expandedGroups[groupId] && (
                            <div className="p-4 bg-white dark:bg-zinc-900">
                              <ul className="divide-y divide-zinc-100 dark:divide-zinc-800 rounded-lg border border-zinc-200 dark:border-zinc-700 overflow-hidden">
                                {files.map(renderFileItem)}
                              </ul>
                            </div>
                          )}
                        </div>
                      ))}

                      {ungroupedFiles.length > 0 && (
                        <div className="border border-zinc-200 dark:border-zinc-700 rounded-lg overflow-hidden">
                          <button
                            onClick={() => toggleAccordion("ungrouped")}
                            className="w-full flex items-center justify-between p-4 bg-zinc-50 dark:bg-zinc-800 hover:bg-zinc-100 dark:hover:bg-zinc-700 transition"
                          >
                            <div className="flex items-center">
                              <span className="font-medium">Ungrouped Files</span>
                              <span className="ml-2 text-xs bg-zinc-200 dark:bg-zinc-700 text-zinc-700 dark:text-zinc-300 px-2 py-0.5 rounded-full">
                                {ungroupedFiles.length} file
                                {ungroupedFiles.length !== 1 ? "s" : ""}
                              </span>
                            </div>
                            <svg
                              className={`w-5 h-5 transition-transform ${
                                expandedGroups["ungrouped"]
                                  ? "transform rotate-180"
                                  : ""
                              }`}
                              fill="none"
                              stroke="currentColor"
                              viewBox="0 0 24 24"
                              xmlns="http://www.w3.org/2000/svg"
                            >
                              <path
                                strokeLinecap="round"
                                strokeLinejoin="round"
                                strokeWidth={2}
                                d="M19 9l-7 7-7-7"
                              />
                            </svg>
                          </button>

                          {expandedGroups["ungrouped"] && (
                            <div className="p-4 bg-white dark:bg-zinc-900">
                              <ul className="divide-y divide-zinc-100 dark:divide-zinc-800 rounded-lg border border-zinc-200 dark:border-zinc-700 overflow-hidden">
                                {ungroupedFiles.map(renderFileItem)}
                              </ul>
                            </div>
                          )}
                        </div>
                      )}
                    </>
                  );
                })()}
              </div>
            ) : (
              // Show files for the selected group only
              <div className="space-y-4">
                <div className="mb-4">
                  <h3 className="text-lg font-medium mb-2">Documents</h3>
                  <ul className="divide-y divide-zinc-100 dark:divide-zinc-800 rounded-lg border border-zinc-200 dark:border-zinc-700 overflow-hidden">
                    {files.filter(file => ['pdf', 'word', 'text', 'document'].includes(file.type)).length > 0 ? (
                      files
                        .filter(file => ['pdf', 'word', 'text', 'document'].includes(file.type))
                        .map(renderFileItem)
                    ) : (
                      <li className="p-3 text-zinc-500 dark:text-zinc-400 text-sm">No documents uploaded</li>
                    )}
                  </ul>
                </div>
                
                <div>
                  <h3 className="text-lg font-medium mb-2">Images</h3>
                  <ul className="divide-y divide-zinc-100 dark:divide-zinc-800 rounded-lg border border-zinc-200 dark:border-zinc-700 overflow-hidden">
                    {files.filter(file => file.type === 'image').length > 0 ? (
                      files
                        .filter(file => file.type === 'image')
                        .map(renderFileItem)
                    ) : (
                      <li className="p-3 text-zinc-500 dark:text-zinc-400 text-sm">No images uploaded</li>
                    )}
                  </ul>
                </div>
              </div>
            )}
          </div>
        )}
      </div>
      </CardContent>
    </Card>
  );
}
